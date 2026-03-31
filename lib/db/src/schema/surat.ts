/**
 * Schema tabel surat
 *
 * Tabel ini menyimpan metadata surat masuk dan surat keluar.
 * File fisik surat (PDF/gambar) disimpan di folder /uploads di backend,
 * sedangkan tabel ini hanya menyimpan nama file dan path-nya.
 *
 * Alur data upload file:
 * 1. Frontend mengirim FormData ke POST /api/surat
 * 2. Multer (middleware) menyimpan file ke /uploads/<timestamp>-<namafile>
 * 3. Route handler menyimpan metadata (termasuk namaFile) ke tabel ini
 * 4. Frontend bisa mengakses file via GET /api/uploads/<namaFile>
 */
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const suratTable = pgTable("surat", {
  id: serial("id").primaryKey(),

  // Nomor surat resmi, contoh: "001/SURAT/2024"
  nomorSurat: varchar("nomor_surat", { length: 100 }).notNull(),

  // Perihal / subjek surat
  perihal: text("perihal").notNull(),

  // Pengirim surat (nama instansi atau orang)
  pengirim: varchar("pengirim", { length: 200 }).notNull(),

  // Penerima surat (nama instansi atau orang)
  penerima: varchar("penerima", { length: 200 }).notNull(),

  // Jenis surat: "masuk" atau "keluar"
  jenis: varchar("jenis", { length: 10 }).notNull(),

  // Tanggal resmi surat (bisa berbeda dengan tanggal entry)
  tanggalSurat: varchar("tanggal_surat", { length: 30 }).notNull(),

  // Keterangan atau catatan tambahan (opsional)
  keterangan: text("keterangan"),

  // Nama file yang tersimpan di folder /uploads (null jika tidak ada file)
  namaFile: varchar("nama_file", { length: 255 }),

  // Siapa yang membuat entry surat ini (foreign key ke users)
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id),

  // Waktu surat di-entry ke sistem
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSuratSchema = createInsertSchema(suratTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSurat = z.infer<typeof insertSuratSchema>;
export type Surat = typeof suratTable.$inferSelect;
