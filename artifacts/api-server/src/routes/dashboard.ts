/**
 * Route Handler: Dashboard Statistik
 *
 * Endpoint-endpoint ini menyediakan data aggregat untuk tampilan dashboard.
 * Menggunakan SQL agregasi langsung dengan Drizzle ORM untuk performa optimal.
 */
import { Router } from "express";
import { sql, eq, desc } from "drizzle-orm";
import { db, suratTable, usersTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/dashboard/stats
 * Ambil statistik ringkasan untuk ditampilkan di dashboard
 *
 * Response:
 * {
 *   totalSurat: number,      -- Total semua surat di sistem
 *   suratMasuk: number,      -- Total surat masuk
 *   suratKeluar: number,     -- Total surat keluar
 *   suratBulanIni: number,   -- Surat yang dibuat bulan ini
 *   suratMingguIni: number   -- Surat yang dibuat minggu ini
 * }
 */
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    // Query paralel untuk efisiensi — semua query dijalankan bersamaan
    const [totalResult, masukResult, keluarResult, bulanIniResult, mingguIniResult] =
      await Promise.all([
        // Total semua surat
        db.select({ count: sql<number>`count(*)` }).from(suratTable),

        // Total surat masuk
        db
          .select({ count: sql<number>`count(*)` })
          .from(suratTable)
          .where(eq(suratTable.jenis, "masuk")),

        // Total surat keluar
        db
          .select({ count: sql<number>`count(*)` })
          .from(suratTable)
          .where(eq(suratTable.jenis, "keluar")),

        // Surat bulan ini (dari tanggal 1 bulan ini sampai sekarang)
        db
          .select({ count: sql<number>`count(*)` })
          .from(suratTable)
          .where(sql`date_trunc('month', created_at) = date_trunc('month', now())`),

        // Surat minggu ini (dari awal minggu sampai sekarang)
        db
          .select({ count: sql<number>`count(*)` })
          .from(suratTable)
          .where(sql`date_trunc('week', created_at) = date_trunc('week', now())`),
      ]);

    res.json({
      totalSurat: Number(totalResult[0]?.count || 0),
      suratMasuk: Number(masukResult[0]?.count || 0),
      suratKeluar: Number(keluarResult[0]?.count || 0),
      suratBulanIni: Number(bulanIniResult[0]?.count || 0),
      suratMingguIni: Number(mingguIniResult[0]?.count || 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error saat mengambil statistik dashboard");
    res.status(500).json({ message: "Gagal mengambil statistik." });
  }
});

/**
 * GET /api/dashboard/recent
 * Ambil 10 surat terbaru untuk ditampilkan di activity feed dashboard
 *
 * Response: Array surat yang diurutkan dari terbaru
 */
router.get("/recent", async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        surat: suratTable,
        user: usersTable,
      })
      .from(suratTable)
      .leftJoin(usersTable, eq(suratTable.createdById, usersTable.id))
      .orderBy(desc(suratTable.createdAt))
      .limit(10);

    const data = result.map(({ surat, user }) => ({
      id: surat.id,
      nomorSurat: surat.nomorSurat,
      perihal: surat.perihal,
      pengirim: surat.pengirim,
      penerima: surat.penerima,
      jenis: surat.jenis,
      tanggalSurat: surat.tanggalSurat,
      keterangan: surat.keterangan,
      namaFile: surat.namaFile,
      urlFile: surat.namaFile ? `/api/uploads/${surat.namaFile}` : null,
      createdById: surat.createdById,
      createdByName: user?.namaLengkap || "Unknown",
      createdAt: surat.createdAt.toISOString(),
    }));

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error saat mengambil surat terbaru");
    res.status(500).json({ message: "Gagal mengambil surat terbaru." });
  }
});

export default router;
