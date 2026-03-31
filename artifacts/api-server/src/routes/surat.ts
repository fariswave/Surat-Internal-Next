/**
 * Route Handler: Manajemen Surat
 *
 * Alur data pembuatan surat dengan upload file:
 * 1. Frontend mengirim FormData (multipart/form-data) ke POST /api/surat
 * 2. Multer middleware menerima file dan menyimpannya di folder /uploads
 * 3. Route handler membaca metadata surat dari req.body
 * 4. Metadata + nama file disimpan ke tabel "surat" di PostgreSQL
 * 5. Response berisi data surat yang baru dibuat (termasuk URL file)
 *
 * Struktur folder uploads:
 *   artifacts/api-server/uploads/<timestamp>-<namafile-aman>
 *
 * File bisa diakses via: GET /api/uploads/<namafile>
 */
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db, suratTable, usersTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// --- Konfigurasi Multer untuk Upload File ---

// Tentukan lokasi penyimpanan file dan penamaan file yang unik
const storage = multer.diskStorage({
  /**
   * destination: menentukan folder tujuan penyimpanan file
   * Folder /uploads dibuat otomatis jika belum ada
   */
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    // Buat folder jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },

  /**
   * filename: menentukan nama file yang tersimpan
   * Format: <timestamp>-<namafile-original>
   * Timestamp ditambahkan agar nama file selalu unik
   */
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // Bersihkan nama file dari karakter yang tidak aman
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

// Filter file: hanya izinkan PDF dan gambar (PNG, JPG, JPEG)
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // File diterima
  } else {
    cb(new Error("Hanya file PDF, PNG, JPG yang diizinkan."));
  }
};

// Inisialisasi multer dengan konfigurasi di atas
// Batas ukuran file: 10MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper: bentuk URL publik untuk mengakses file
const getFileUrl = (namaFile: string | null) => {
  if (!namaFile) return null;
  return `/api/uploads/${namaFile}`;
};

// Helper: format data surat dengan join ke tabel users
const formatSurat = (
  surat: typeof suratTable.$inferSelect,
  user: typeof usersTable.$inferSelect,
) => ({
  id: surat.id,
  nomorSurat: surat.nomorSurat,
  perihal: surat.perihal,
  pengirim: surat.pengirim,
  penerima: surat.penerima,
  jenis: surat.jenis,
  tanggalSurat: surat.tanggalSurat,
  keterangan: surat.keterangan,
  namaFile: surat.namaFile,
  urlFile: getFileUrl(surat.namaFile),
  createdById: surat.createdById,
  createdByName: user.namaLengkap,
  createdAt: surat.createdAt.toISOString(),
});

// Semua route surat membutuhkan autentikasi
router.use(authMiddleware);

/**
 * GET /api/surat
 * Ambil daftar surat dengan pagination dan filter opsional
 *
 * Query params:
 *   jenis?: "masuk" | "keluar"  - filter berdasarkan jenis surat
 *   page?: number               - nomor halaman (default: 1)
 *   limit?: number              - item per halaman (default: 10)
 *
 * Response: { data: Surat[], total: number, page: number, limit: number }
 */
router.get("/", async (req: AuthRequest, res) => {
  try {
    const jenis = req.query.jenis as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    // Bangun kondisi WHERE berdasarkan filter yang diberikan
    const whereClause = jenis
      ? eq(suratTable.jenis, jenis)
      : undefined;

    // Ambil total data untuk pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(suratTable)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    // Ambil data surat dengan join ke tabel users (untuk mendapatkan nama pembuat)
    const suratList = await db
      .select({
        surat: suratTable,
        user: usersTable,
      })
      .from(suratTable)
      .leftJoin(usersTable, eq(suratTable.createdById, usersTable.id))
      .where(whereClause)
      .orderBy(desc(suratTable.createdAt)) // Urutkan dari terbaru
      .limit(limit)
      .offset(offset);

    const data = suratList.map(({ surat, user }) =>
      formatSurat(surat, user!),
    );

    res.json({ data, total, page, limit });
  } catch (err) {
    req.log.error({ err }, "Error saat mengambil daftar surat");
    res.status(500).json({ message: "Gagal mengambil daftar surat." });
  }
});

/**
 * POST /api/surat
 * Buat surat baru dengan upload file opsional
 *
 * Content-Type: multipart/form-data
 * Body fields: nomorSurat, perihal, pengirim, penerima, jenis, tanggalSurat, keterangan?, file?
 *
 * Alur:
 * 1. Multer memproses file dari request
 * 2. Validasi field yang wajib diisi
 * 3. Simpan metadata ke database
 * 4. Return data surat yang baru dibuat
 */
router.post("/", upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const { nomorSurat, perihal, pengirim, penerima, jenis, tanggalSurat, keterangan } =
      req.body;

    // Validasi field yang wajib diisi
    if (!nomorSurat || !perihal || !pengirim || !penerima || !jenis || !tanggalSurat) {
      // Jika ada file yang sudah diupload, hapus file tersebut karena validasi gagal
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      res.status(400).json({
        message: "Field nomorSurat, perihal, pengirim, penerima, jenis, dan tanggalSurat wajib diisi.",
      });
      return;
    }

    // Validasi nilai field jenis
    if (!["masuk", "keluar"].includes(jenis)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(400).json({ message: "Jenis surat harus 'masuk' atau 'keluar'." });
      return;
    }

    // Nama file yang disimpan oleh multer (null jika tidak ada file)
    const namaFile = req.file ? req.file.filename : null;

    // Simpan data surat ke database
    const inserted = await db
      .insert(suratTable)
      .values({
        nomorSurat,
        perihal,
        pengirim,
        penerima,
        jenis,
        tanggalSurat,
        keterangan: keterangan || null,
        namaFile,
        createdById: req.user!.id, // ID user yang sedang login
      })
      .returning(); // Kembalikan data yang baru di-insert

    const newSurat = inserted[0];

    // Ambil data user pembuat untuk response lengkap
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);

    req.log.info(
      { suratId: newSurat.id, jenis: newSurat.jenis, userId: req.user!.id },
      "Surat baru berhasil dibuat",
    );

    res.status(201).json(formatSurat(newSurat, users[0]));
  } catch (err) {
    req.log.error({ err }, "Error saat membuat surat baru");
    res.status(500).json({ message: "Gagal membuat surat baru." });
  }
});

/**
 * GET /api/surat/:id
 * Ambil detail surat berdasarkan ID
 */
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID surat tidak valid." });
      return;
    }

    const result = await db
      .select({ surat: suratTable, user: usersTable })
      .from(suratTable)
      .leftJoin(usersTable, eq(suratTable.createdById, usersTable.id))
      .where(eq(suratTable.id, id))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ message: "Surat tidak ditemukan." });
      return;
    }

    res.json(formatSurat(result[0].surat, result[0].user!));
  } catch (err) {
    req.log.error({ err }, "Error saat mengambil detail surat");
    res.status(500).json({ message: "Gagal mengambil detail surat." });
  }
});

/**
 * DELETE /api/surat/:id
 * Hapus surat berdasarkan ID
 *
 * Hanya admin yang bisa menghapus surat.
 * File fisik di folder /uploads juga akan dihapus.
 */
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    // Cek apakah user adalah admin
    if (req.user!.role !== "admin") {
      res.status(403).json({
        message: "Akses ditolak. Hanya admin yang dapat menghapus surat.",
      });
      return;
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID surat tidak valid." });
      return;
    }

    // Ambil data surat terlebih dahulu untuk mendapatkan nama file
    const existing = await db
      .select()
      .from(suratTable)
      .where(eq(suratTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ message: "Surat tidak ditemukan." });
      return;
    }

    // Hapus record dari database
    await db.delete(suratTable).where(eq(suratTable.id, id));

    // Hapus file fisik jika ada
    if (existing[0].namaFile) {
      const filePath = path.join(process.cwd(), "uploads", existing[0].namaFile);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          req.log.warn({ filePath }, "Gagal menghapus file fisik surat");
        }
      });
    }

    req.log.info({ suratId: id, userId: req.user!.id }, "Surat berhasil dihapus");
    res.json({ message: "Surat berhasil dihapus." });
  } catch (err) {
    req.log.error({ err }, "Error saat menghapus surat");
    res.status(500).json({ message: "Gagal menghapus surat." });
  }
});

export default router;
