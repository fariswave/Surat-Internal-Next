/**
 * Route Handler: Autentikasi
 *
 * Alur data login:
 * 1. Frontend mengirim POST /api/auth/login dengan { username, password }
 * 2. Route mencari user di database berdasarkan username
 * 3. Password dibandingkan dengan hash bcrypt yang tersimpan
 * 4. Jika cocok, buat JWT token yang berisi { id, username, role }
 * 5. Token dikembalikan ke frontend bersama data user
 * 6. Frontend menyimpan token di localStorage untuk request selanjutnya
 *
 * Security notes:
 * - Password tidak pernah dikembalikan ke frontend
 * - JWT token di-sign dengan secret dari environment variable
 * - Token expired dalam 24 jam
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

/**
 * POST /api/auth/login
 * Login pengguna dan mengembalikan JWT token
 *
 * Body: { username: string, password: string }
 * Response: { token: string, user: { id, username, namaLengkap, role, email } }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input: username dan password harus ada
    if (!username || !password) {
      res.status(400).json({
        message: "Username dan password harus diisi.",
      });
      return;
    }

    // Cari user di database berdasarkan username
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    // Jika user tidak ditemukan
    if (users.length === 0) {
      res.status(401).json({
        message: "Username atau password salah.",
      });
      return;
    }

    const user = users[0];

    // Bandingkan password yang dikirim dengan hash bcrypt di database
    // bcrypt.compare() akan melakukan hash pada password input dan membandingkan
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "Username atau password salah.",
      });
      return;
    }

    // Password cocok — buat JWT token
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "default-secret-ganti-di-production";

    // Payload yang akan di-encode dalam token (jangan simpan data sensitif!)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Buat token yang expired dalam 24 jam
    const token = jwt.sign(tokenPayload, secret, { expiresIn: "24h" });

    req.log.info({ userId: user.id, username: user.username }, "User berhasil login");

    // Kembalikan token dan data user ke frontend
    // PENTING: password TIDAK dikembalikan
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error saat login");
    res.status(500).json({ message: "Terjadi kesalahan server saat login." });
  }
});

/**
 * GET /api/auth/me
 * Ambil data profil pengguna yang sedang login (berdasarkan JWT token)
 *
 * Header: Authorization: Bearer <token>
 * Response: { id, username, namaLengkap, role, email }
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // req.user sudah diisi oleh authMiddleware setelah verifikasi token
    const userId = req.user!.id;

    // Ambil data user terbaru dari database (bukan dari token, untuk akurasi)
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        namaLengkap: usersTable.namaLengkap,
        role: usersTable.role,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (users.length === 0) {
      res.status(404).json({ message: "User tidak ditemukan." });
      return;
    }

    res.json(users[0]);
  } catch (err) {
    req.log.error({ err }, "Error saat mengambil profil user");
    res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

export default router;
