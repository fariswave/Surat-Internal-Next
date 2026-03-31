# Panduan Belajar Mandiri: Aplikasi Persuratan Internal
## Fullstack TypeScript — Express.js + React + PostgreSQL

> **Catatan Stack Teknologi**
> Aplikasi ini dibangun dengan:
> - **Backend**: Express.js + TypeScript (bukan .NET Core)
> - **Frontend**: React + Vite (bukan Next.js)
> - **Database**: PostgreSQL + Drizzle ORM
> - **Autentikasi**: JWT (JSON Web Token)
> - **Upload File**: Multer
> - **Kontrak API**: OpenAPI Specification + orval (code generator)

---

## Gambaran Besar: Bagaimana Semua Bagian Terhubung

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Pengguna)                        │
│                                                                   │
│  React + Vite  ◄──── Generated API Hooks (orval) ◄──── OpenAPI  │
│  (artifacts/persuratan)        (lib/api-client-react)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Request (JSON / FormData)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                               │
│                                                                   │
│  Express.js + TypeScript                                          │
│  (artifacts/api-server)                                          │
│                                                                   │
│  [Routes] → [Middleware JWT] → [Handler] → [Drizzle ORM]        │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQL Query
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE                                    │
│                                                                   │
│  PostgreSQL  ←──── Drizzle ORM Schema                            │
│  (lib/db)                                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kurikulum 7 Hari

| Hari | Topik | File Kunci | Konsep Wajib |
|------|-------|------------|--------------|
| 1 | **Database & Schema** | `lib/db/src/schema/` | Tabel, Kolom, Relasi, ORM |
| 2 | **Kontrak API (OpenAPI)** | `lib/api-spec/openapi.yaml` | Endpoint, Request, Response, Code Generation |
| 3 | **Backend Express.js** | `artifacts/api-server/src/` | Route, Handler, Server |
| 4 | **Autentikasi JWT** | `artifacts/api-server/src/middlewares/auth.ts` | Token, Middleware, bcrypt |
| 5 | **Frontend React** | `artifacts/persuratan/src/pages/` | Component, Hook, State |
| 6 | **Upload File** | `artifacts/api-server/src/routes/surat.ts` | Multer, FormData, Static File |
| 7 | **Integrasi Penuh** | Semua file | Debugging, Alur Data End-to-End |

---

## Hari 1: Database & Schema

### Mengapa Layer Database Ada?

**Analogi**: Bayangkan aplikasi persuratan ini seperti sebuah **kantor fisik**. Semua surat yang masuk dan keluar perlu disimpan di **lemari arsip**. Database adalah lemari arsip digital itu. Tanpa lemari arsip, setiap kali kantor tutup (server mati), semua surat hilang.

Layer database ada karena:
- Data perlu **bertahan** meskipun server dimatikan dan dinyalakan kembali
- Data perlu **terstruktur** agar mudah dicari (bayangkan arsip yang berantakan vs. yang terindeks rapi)
- Data perlu **aman** dari penulisan ganda atau data yang tidak konsisten

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **Tabel (Table)** | Lembar spreadsheet — baris adalah data, kolom adalah properti |
| **Schema** | Denah/blueprint tabel — mendefinisikan nama dan tipe setiap kolom |
| **ORM** | Object-Relational Mapper — jembatan antara kode TypeScript dan SQL mentah |
| **Primary Key** | Nomor identitas unik setiap baris (seperti NIK pada KTP) |
| **Foreign Key** | Kolom yang merujuk ke Primary Key tabel lain (relasi antar tabel) |
| **Migration** | Proses mengubah struktur tabel di database sesuai schema terbaru |
| **Drizzle ORM** | Library ORM yang dipakai di proyek ini — ditulis dalam TypeScript |

### File yang Relevan

```
lib/
└── db/
    └── src/
        ├── index.ts          ← Koneksi ke database PostgreSQL
        ├── schema/
        │   ├── users.ts      ← Definisi tabel 'users'
        │   └── surat.ts      ← Definisi tabel 'surat'
        └── seed.ts           ← Script untuk mengisi data awal (dummy data)
```

### Cara Membaca Schema Drizzle

Buka file `lib/db/src/schema/users.ts`:

```typescript
// 'pgTable' adalah fungsi untuk mendefinisikan tabel PostgreSQL
export const users = pgTable("users", {
  
  // 'serial' = angka otomatis bertambah (1, 2, 3, ...)
  // 'primaryKey()' = ini adalah ID unik setiap baris
  id: serial("id").primaryKey(),

  // 'varchar' = teks dengan batas panjang maksimal
  // 'notNull()' = wajib diisi, tidak boleh kosong
  username: varchar("username", { length: 100 }).notNull().unique(),

  // 'text' = teks panjang tanpa batas
  password: text("password").notNull(),

  // 'timestamp' = menyimpan tanggal + waktu
  // 'defaultNow()' = otomatis diisi dengan waktu saat data dibuat
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Bagaimana terhubung ke bagian lain?**

```
schema/users.ts  ──►  Drizzle ORM  ──►  PostgreSQL (tabel nyata)
      │
      └──►  dipakai oleh routes/auth.ts untuk query data pengguna
```

### Cara Membaca Schema Surat

Buka file `lib/db/src/schema/surat.ts`. Perhatikan kolom `createdById`:

```typescript
// 'references(() => users.id)' adalah Foreign Key
// Artinya: kolom ini merujuk ke ID di tabel 'users'
// Seperti menulis nama pegawai yang mengarsipkan surat
createdById: integer("created_by_id").references(() => users.id),
```

**Analogi Foreign Key**: Pada arsip fisik, setiap map surat bertuliskan "Diarsipkan oleh: Budi". Nama "Budi" merujuk ke data pegawai di buku absen. Itulah Foreign Key — satu data merujuk ke data lain.

### Cara Koneksi Database Bekerja

Buka file `lib/db/src/index.ts`:

```typescript
// 'DATABASE_URL' adalah alamat lengkap database
// Format: postgres://username:password@host:port/nama_database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 'drizzle(pool)' membungkus koneksi dengan kemampuan ORM
export const db = drizzle(pool);
```

**Analogi**: `DATABASE_URL` adalah seperti alamat lengkap kantor (`Jl. Merdeka No. 1, Jakarta`). Tanpa alamat ini, aplikasi tidak tahu harus "pergi ke mana" untuk mengambil data.

### Contoh Query Drizzle (vs. SQL Mentah)

**Dengan SQL mentah** (sulit, rentan typo):
```sql
SELECT * FROM surat WHERE jenis = 'masuk' ORDER BY tanggal_surat DESC;
```

**Dengan Drizzle ORM** (aman, ada autocomplete TypeScript):
```typescript
const hasilSurat = await db
  .select()
  .from(surat)
  .where(eq(surat.jenis, "masuk"))
  .orderBy(desc(surat.tanggalSurat));
```

Keduanya menghasilkan data yang sama — Drizzle hanya menerjemahkan kode TypeScript menjadi SQL secara otomatis.

### Perintah Database yang Dipakai di Proyek Ini

```bash
# Mendorong schema terbaru ke database (membuat/mengubah tabel)
pnpm --filter @workspace/db run db:push

# Mengisi data awal (dummy users + dummy surat)
pnpm --filter @workspace/db run db:seed
```

---

### Tantangan Hari 1

**Tugas**: Tambahkan kolom baru `prioritas` pada tabel `surat`.

**Langkah-langkah**:
1. Buka file `lib/db/src/schema/surat.ts`
2. Tambahkan kolom berikut di dalam `pgTable(...)`:
   ```typescript
   prioritas: varchar("prioritas", { length: 20 }).default("normal"),
   ```
3. Jalankan perintah `pnpm --filter @workspace/db run db:push` untuk memperbarui tabel di database
4. Verifikasi dengan membuka tabel surat di database — kolom `prioritas` seharusnya sudah muncul

**Pertanyaan Refleksi**:
- Mengapa kita perlu menjalankan `db:push` setelah mengubah schema?
- Apa yang terjadi jika dua surat memiliki `id` yang sama?
- Mengapa `createdAt` menggunakan `defaultNow()` alih-alih diisi manual?

---

## Hari 2: Kontrak API (OpenAPI Specification)

### Mengapa Kontrak API Ada?

**Analogi**: Bayangkan Anda memesan makanan di restoran. Menu adalah **kontrak** antara dapur (backend) dan pelanggan (frontend) — menu mendefinisikan apa yang tersedia, bahan-bahannya, dan harganya. Tanpa menu, pelanggan tidak tahu apa yang bisa dipesan, dan dapur tidak tahu harus menyiapkan apa.

OpenAPI adalah "menu" aplikasi ini.

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **Endpoint** | "Alamat" spesifik untuk satu fungsi API (misal: `/api/surat`) |
| **HTTP Method** | Jenis aksi: GET (ambil), POST (buat), PUT (ubah), DELETE (hapus) |
| **Request Body** | Data yang dikirim frontend ke backend |
| **Response** | Data yang dikembalikan backend ke frontend |
| **Status Code** | Kode jawaban: 200 (OK), 201 (Dibuat), 401 (Tidak Terotorisasi), 404 (Tidak Ditemukan) |
| **Code Generation** | Proses otomatis mengubah file OpenAPI menjadi kode TypeScript siap pakai |

### File yang Relevan

```
lib/
└── api-spec/
    └── openapi.yaml    ← Kontrak API (sumber kebenaran tunggal)

lib/
└── api-client-react/
    └── src/
        └── generated/
            ├── api.ts          ← Kode TypeScript yang di-generate otomatis dari openapi.yaml
            └── api.schemas.ts  ← Tipe data TypeScript yang di-generate otomatis
```

### Cara Membaca openapi.yaml

Setiap endpoint di `openapi.yaml` memiliki struktur:
- **path**: Alamat endpoint (misal: `/api/surat/{id}`)
- **method**: Jenis aksi (get, post, delete)
- **summary**: Deskripsi singkat
- **requestBody**: Format data yang dikirim
- **responses**: Format data yang dikembalikan

### Code Generation dengan orval

Saat Anda menjalankan `pnpm --filter @workspace/api-client-react run generate`, orval membaca `openapi.yaml` dan secara otomatis menghasilkan:
- **React Query hooks** siap pakai (`useGetSuratList`, `useCreateSurat`, dll.)
- **TypeScript types** untuk semua data (`Surat`, `User`, `CreateSuratRequest`, dll.)

**Jangan ubah file di folder `generated/` secara manual** — file tersebut akan ditimpa setiap kali code generation dijalankan.

### Tantangan Hari 2

Buka `lib/api-spec/openapi.yaml` dan temukan:
1. Endpoint mana yang membutuhkan autentikasi? (Cari `bearerAuth`)
2. Berapa batas maksimum ukuran file yang didefinisikan di schema `CreateSuratRequest`?
3. Response apa yang dikembalikan saat login berhasil?

---

## Hari 3: Backend Express.js

### Mengapa Express.js Ada?

**Analogi**: Express.js adalah **resepsionis kantor**. Setiap request dari browser datang ke resepsionis, yang kemudian mengarahkannya ke departemen yang tepat (route handler). Resepsionis juga bisa menolak tamu yang tidak punya ID (middleware autentikasi).

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **Route** | Aturan "jika URL-nya ini dan method-nya itu, panggil fungsi ini" |
| **Handler** | Fungsi yang dijalankan saat route cocok |
| **Middleware** | Fungsi yang berjalan *sebelum* handler — seperti pos pemeriksaan |
| **Request (req)** | Objek berisi semua info dari browser (URL, header, body, dll.) |
| **Response (res)** | Objek untuk mengirim jawaban kembali ke browser |
| **Port** | Nomor pintu server (API server pakai port 8080) |

### File yang Relevan

```
artifacts/api-server/src/
├── index.ts              ← Titik masuk server, konfigurasi Express
├── routes/
│   ├── auth.ts           ← Endpoint login, register, profil
│   └── surat.ts          ← Endpoint CRUD surat + upload file
└── middlewares/
    └── auth.ts           ← Middleware pemeriksaan JWT
```

### Tantangan Hari 3

Buka `artifacts/api-server/src/routes/surat.ts` dan tambahkan endpoint baru:
`GET /api/surat/statistik` yang mengembalikan jumlah surat masuk dan keluar.

---

## Hari 4: Autentikasi JWT

### Mengapa JWT Ada?

**Analogi**: JWT seperti **gelang tamu di konser**. Saat login, Anda mendapat gelang (token) yang membuktikan Anda sudah membayar tiket. Setiap kali masuk ke area berbeda, petugas hanya perlu cek gelang — mereka tidak perlu menelepon loket tiket setiap saat. Gelang punya masa berlaku (expiry) dan tidak bisa dipalsukan.

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **JWT** | JSON Web Token — string terenkripsi berisi identitas pengguna |
| **Payload** | Data yang tersimpan di dalam JWT (id, username, role) |
| **Secret Key** | Kunci rahasia untuk menandatangani JWT agar tidak bisa dipalsukan |
| **Bearer Token** | Cara mengirim JWT di HTTP header: `Authorization: Bearer <token>` |
| **bcrypt** | Algoritma untuk mengacak password agar tidak tersimpan polos di database |
| **Expiry** | Masa berlaku token (aplikasi ini: 24 jam) |

### File yang Relevan

```
artifacts/api-server/src/middlewares/auth.ts   ← Verifikasi JWT
artifacts/api-server/src/routes/auth.ts        ← Login & buat JWT
lib/api-client-react/src/custom-fetch.ts       ← Kirim JWT dari frontend
```

### Tantangan Hari 4

Buka `artifacts/api-server/src/middlewares/auth.ts`:
1. Di bagian mana token diambil dari header?
2. Apa yang terjadi jika token sudah kedaluwarsa?
3. Bisakah Anda menambahkan log `console.log` untuk mencetak `role` pengguna setiap kali ada request masuk? (Untuk tujuan belajar debugging)

---

## Hari 5: Frontend React

### Mengapa React Ada?

**Analogi**: React adalah seperti **papan pengumuman interaktif**. Saat ada data baru (surat masuk), papan otomatis memperbarui dirinya sendiri tanpa harus diganti manual. Anda mendefinisikan "aturan tampilan", React yang mengurus pembaruannya.

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **Component** | Potongan UI yang bisa dipakai ulang (seperti lego) |
| **State** | Data yang bisa berubah dan memicu tampilan berubah saat ia berubah |
| **Hook** | Fungsi khusus React yang dimulai dengan `use` (useState, useEffect, dll.) |
| **Props** | Data yang dikirim dari komponen induk ke komponen anak |
| **React Query** | Library untuk mengambil data dari API dan menyimpannya di cache |
| **TypeScript** | JavaScript dengan sistem tipe — mencegah bug akibat data yang salah tipe |

### File yang Relevan

```
artifacts/persuratan/src/
├── App.tsx               ← Konfigurasi routing, ProtectedRoute
├── pages/
│   ├── login.tsx         ← Halaman login
│   ├── dashboard.tsx     ← Halaman dashboard
│   ├── surat-list.tsx    ← Daftar surat
│   ├── surat-create.tsx  ← Form buat surat baru
│   └── surat-detail.tsx  ← Detail surat
└── components/
    └── layout.tsx        ← Sidebar + header (dipakai di semua halaman)
```

### Props — Analogi Sederhana

**Analogi**: Props seperti **isian formulir** yang diberikan ke komponen. Komponen `Badge` menerima props `variant="destructive"` — seperti mengisi formulir "warna: merah". Komponen tidak peduli siapa yang mengisinya, ia hanya menampilkan sesuai instruksi.

### Tantangan Hari 5

Buka `artifacts/persuratan/src/pages/surat-list.tsx`:
1. Ubah warna badge untuk surat `masuk` dari biru ke hijau
2. Tambahkan kolom "Dibuat Oleh" di tabel (data `createdByName` sudah ada di response API)
3. Coba tambahkan pesan "Memuat data..." yang lebih informatif saat `isLoading === true`

---

## Hari 6: Upload File

### Mengapa Upload File Berbeda?

**Analogi**: Mengirim JSON biasa seperti **mengirim SMS** — hanya teks. Mengirim file seperti **mengirim paket pos** — formatnya berbeda, butuh penanganan khusus. Di web, format paket pos ini disebut `multipart/form-data`.

### Istilah Teknis Wajib

| Istilah | Arti Sederhana |
|---------|----------------|
| **Multer** | Library Express untuk menerima dan menyimpan file yang diupload |
| **FormData** | Format HTTP untuk mengirim campuran teks + file sekaligus |
| **MIME Type** | Jenis file: `application/pdf`, `image/jpeg`, dll. |
| **Static File Serving** | Membuat file di server bisa diakses lewat URL |
| **Buffer** | Data file dalam bentuk mentah (bytes) sebelum disimpan |

### File yang Relevan

```
artifacts/api-server/src/routes/surat.ts    ← Konfigurasi Multer + endpoint upload
artifacts/api-server/uploads/               ← Folder penyimpanan file yang diupload
artifacts/persuratan/src/pages/surat-create.tsx  ← Form upload di frontend
lib/api-client-react/src/generated/api.ts  ← Generated hook yang bangun FormData
```

### Tantangan Hari 6

Buka `artifacts/api-server/src/routes/surat.ts`:
1. Berapa batas ukuran file saat ini (dalam MB)?
2. Ekstensi file apa saja yang diizinkan? Coba tambahkan `.docx` ke daftar yang diizinkan
3. Di mana file disimpan setelah diupload? Apakah nama filenya dipertahankan?

---

## Hari 7: Integrasi Penuh & Debugging

### Alur Data End-to-End: Dari Klik Tombol Hingga Data Tersimpan

Lacak apa yang terjadi saat pengguna menekan tombol "Simpan" di form buat surat:

```
1. [Frontend] onSubmit() dipanggil di surat-create.tsx
      ↓
2. [Generated Hook] useCreateSurat().mutateAsync({ data: payload })
      ↓
3. [Generated API] createSurat() membangun FormData dan memanggil customFetch()
      ↓
4. [custom-fetch.ts] Menambahkan header "Authorization: Bearer <token>"
      ↓
5. [HTTP] POST /api/surat dengan body FormData
      ↓
6. [Express Router] Route POST /api/surat cocok, middleware JWT dijalankan
      ↓
7. [Middleware] JWT diverifikasi, data pengguna ditaruh di req.user
      ↓
8. [Multer] File dari FormData disimpan ke folder /uploads/
      ↓
9. [Handler] Data teks + nama file disimpan ke database via Drizzle ORM
      ↓
10. [Response] Server kirim balik data surat yang baru dibuat (status 201)
       ↓
11. [Frontend] React Query invalidates cache → daftar surat otomatis refresh
```

### Tantangan Hari 7 (Tantangan Besar)

Implementasikan fitur **Edit Surat**:
1. Tambahkan endpoint `PUT /api/surat/:id` di backend (lihat pola dari endpoint yang sudah ada)
2. Buat halaman `surat-edit.tsx` di frontend (salin struktur dari `surat-create.tsx`)
3. Tambahkan tombol "Edit" di halaman detail surat
4. Tambahkan route `/surat/:id/edit` di `App.tsx`

---

## Referensi Cepat: Perintah yang Sering Dipakai

```bash
# Jalankan API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Jalankan frontend (port 18182)
pnpm --filter @workspace/persuratan run dev

# Push schema database
pnpm --filter @workspace/db run db:push

# Isi data dummy
pnpm --filter @workspace/db run db:seed

# Generate ulang kode dari OpenAPI spec
pnpm --filter @workspace/api-client-react run generate

# Install semua dependensi
pnpm install
```

## Referensi Cepat: Akun Dummy untuk Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password` | Admin (bisa hapus surat) |
| `budi` | `password` | Staff |
| `siti` | `password` | Manager |

---

*Panduan ini dibuat khusus untuk proyek Aplikasi Persuratan Internal.*
*Stack: Express.js + TypeScript + React + Vite + PostgreSQL + Drizzle ORM*
