/**
 * Middleware JWT (JSON Web Token) untuk proteksi routes API
 *
 * Cara kerja middleware ini:
 * 1. Setiap request yang butuh autentikasi akan melewati fungsi ini
 * 2. Middleware membaca header "Authorization" dari request
 * 3. Jika header tidak ada atau formatnya salah, request ditolak (401)
 * 4. Token JWT diverifikasi menggunakan JWT_SECRET dari environment
 * 5. Jika valid, data user (id, username, role) disimpan di req.user
 * 6. Jika tidak valid/expired, request ditolak (401)
 * 7. next() dipanggil untuk melanjutkan ke route handler berikutnya
 *
 * Penggunaan:
 *   router.get("/protected-route", authMiddleware, (req, res) => {...})
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Request interface agar bisa menyimpan data user yang sudah terverifikasi
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Payload yang disimpan di dalam JWT token
export interface JwtPayload {
  id: number;
  username: string;
  role: string;
}

/**
 * Middleware autentikasi JWT
 *
 * @param req - Express request object (akan diextend dengan req.user)
 * @param res - Express response object
 * @param next - Fungsi untuk melanjutkan ke middleware/handler berikutnya
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  // Ambil header Authorization dari request
  const authHeader = req.headers.authorization;

  // Cek apakah header ada dan formatnya "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Akses ditolak. Token autentikasi tidak ditemukan.",
      error: "UNAUTHORIZED",
    });
    return;
  }

  // Ekstrak token dari header (hapus prefix "Bearer ")
  const token = authHeader.substring(7);

  // Ambil JWT secret dari environment variable
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "default-secret-ganti-di-production";

  try {
    // Verifikasi dan decode token JWT
    // Jika token expired atau signature tidak valid, akan throw error
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Simpan data user ke dalam request object
    // Data ini bisa diakses di route handler via req.user
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };

    // Lanjutkan ke route handler berikutnya
    next();
  } catch {
    // Token tidak valid, expired, atau signature salah
    res.status(401).json({
      message: "Token tidak valid atau sudah kadaluarsa. Silakan login ulang.",
      error: "INVALID_TOKEN",
    });
    return;
  }
};
