import { Router, type IRouter } from "express";
import path from "path";
import express from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import suratRouter from "./surat.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

// Health check
router.use(healthRouter);

// Autentikasi: POST /api/auth/login, GET /api/auth/me
router.use("/auth", authRouter);

// Manajemen surat: GET|POST /api/surat, GET|DELETE /api/surat/:id
router.use("/surat", suratRouter);

// Dashboard stats: GET /api/dashboard/stats, GET /api/dashboard/recent
router.use("/dashboard", dashboardRouter);

// Melayani file upload secara statis
// File yang diupload bisa diakses via: GET /api/uploads/<namafile>
const uploadsDir = path.join(process.cwd(), "uploads");
router.use("/uploads", express.static(uploadsDir));

export default router;
