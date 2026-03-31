/**
 * Schema tabel users (pengguna sistem)
 *
 * Tabel ini menyimpan data pengguna yang bisa login ke sistem persuratan.
 * Setiap user memiliki role: admin, staff, atau manager.
 *
 * Relasi:
 * - users (1) -> surat (*): Satu user bisa membuat banyak surat
 */
import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(), // Disimpan sebagai bcrypt hash
  namaLengkap: varchar("nama_lengkap", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("staff"), // admin | staff | manager
  email: varchar("email", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
