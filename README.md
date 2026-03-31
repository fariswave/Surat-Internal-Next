# Aplikasi Persuratan Internal

Sistem manajemen surat masuk dan keluar untuk organisasi/instansi, dibangun dengan arsitektur fullstack modern menggunakan Node.js/TypeScript.

---

## Akun Login (User Dummy)

| Username  | Password     | Role    | Nama Lengkap       |
|-----------|--------------|---------|-------------------|
| `admin`   | `password`   | Admin   | Administrator Sistem |
| `staff`   | `password`   | Staff   | Budi Santoso      |
| `manager` | `password`   | Manager | Siti Rahayu       |

---

## Stack Teknologi

| Layer        | Teknologi                                     |
|--------------|-----------------------------------------------|
| Frontend     | React + Vite, Tailwind CSS, TanStack Query    |
| Backend API  | Express.js (Node.js/TypeScript)               |
| Database     | PostgreSQL + Drizzle ORM (Code First)         |
| Autentikasi  | JWT (JSON Web Token) + bcrypt                 |
| Upload File  | Multer (disimpan di folder `/uploads`)        |
| API Contract | OpenAPI 3.1 + Orval codegen                   |

---

## Struktur Folder

```
workspace/
├── artifacts/
│   ├── api-server/          # Backend Express.js
│   │   ├── src/
│   │   │   ├── middlewares/
│   │   │   │   └── auth.ts  # Middleware validasi JWT
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Login, profil user
│   │   │   │   ├── surat.ts     # CRUD surat + upload file
│   │   │   │   └── dashboard.ts # Statistik & feed terbaru
│   │   │   ├── app.ts       # Setup Express (cors, middleware, routes)
│   │   │   └── index.ts     # Entry point (baca PORT, start server)
│   │   └── uploads/         # Folder penyimpanan file fisik surat
│   │
│   └── persuratan/          # Frontend React + Vite
│       └── src/
│           ├── pages/
│           │   ├── login.tsx        # Halaman login
│           │   ├── dashboard.tsx    # Halaman dashboard
│           │   ├── surat-list.tsx   # Daftar surat
│           │   ├── surat-create.tsx # Form buat surat
│           │   └── surat-detail.tsx # Detail surat
│           ├── lib/
│           │   └── auth.ts    # Helper: simpan/baca token JWT
│           └── App.tsx        # Router utama + ProtectedRoute
│
└── lib/
    ├── api-spec/
    │   └── openapi.yaml     # Kontrak API (source of truth)
    ├── api-client-react/
    │   └── src/generated/   # React Query hooks (auto-generated)
    ├── api-zod/
    │   └── src/generated/   # Zod schemas (auto-generated)
    └── db/
        └── src/schema/
            ├── users.ts     # Tabel users
            └── surat.ts     # Tabel surat
```

---

## Alur Data: Frontend → API → PostgreSQL

Berikut penjelasan lengkap alur data untuk setiap operasi utama:

### 1. Login

```
Frontend (login.tsx)
  │
  ├─ User isi form username + password
  ├─ Panggil: useLogin() mutation hook
  │
  ↓
customFetch (custom-fetch.ts)
  │
  ├─ Kirim: POST /api/auth/login
  │   Body: { "username": "admin", "password": "password" }
  │   Header: Content-Type: application/json
  │
  ↓
API Server (routes/auth.ts → POST /auth/login)
  │
  ├─ Validasi: username dan password ada
  ├─ Query DB: SELECT * FROM users WHERE username = 'admin'
  ├─ Verifikasi: bcrypt.compare(password, user.password)
  ├─ Jika valid: jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '24h' })
  ├─ Return: { token: "eyJ...", user: { id, username, namaLengkap, role, email } }
  │
  ↓
Frontend (login.tsx)
  │
  ├─ Simpan token ke localStorage("token")
  ├─ Simpan data user ke localStorage("user")
  └─ Redirect ke halaman dashboard "/"
```

### 2. Mengambil Daftar Surat (Protected Route)

```
Frontend (surat-list.tsx)
  │
  ├─ Panggil: useGetSuratList({ jenis: "masuk" }) query hook
  │
  ↓
customFetch (custom-fetch.ts)
  │
  ├─ Ambil token dari localStorage
  ├─ Kirim: GET /api/surat?jenis=masuk
  │   Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
  │
  ↓
API Server (middlewares/auth.ts → authMiddleware)
  │
  ├─ Baca header Authorization
  ├─ Ekstrak token (hapus "Bearer " prefix)
  ├─ Verifikasi: jwt.verify(token, JWT_SECRET)
  ├─ Decode payload: { id: 1, username: "admin", role: "admin" }
  └─ Simpan ke req.user, panggil next()
  │
  ↓
API Server (routes/surat.ts → GET /)
  │
  ├─ Baca query params: jenis=masuk, page=1, limit=10
  ├─ Query DB:
  │   SELECT surat.*, users.nama_lengkap
  │   FROM surat
  │   LEFT JOIN users ON surat.created_by_id = users.id
  │   WHERE surat.jenis = 'masuk'
  │   ORDER BY surat.created_at DESC
  │   LIMIT 10 OFFSET 0
  └─ Return: { data: [...], total: 5, page: 1, limit: 10 }
  │
  ↓
Frontend (surat-list.tsx)
  │
  └─ TanStack Query cache data → render tabel surat
```

### 3. Buat Surat Baru dengan Upload File

```
Frontend (surat-create.tsx)
  │
  ├─ User isi form: nomor, perihal, pengirim, penerima, jenis, tanggal
  ├─ User pilih file (PDF/PNG/JPG, maks 10MB)
  ├─ Buat FormData:
  │     formData.append("nomorSurat", "001/SK/I/2026")
  │     formData.append("perihal", "Undangan Rapat")
  │     formData.append("jenis", "keluar")
  │     ... (field lain)
  │     formData.append("file", fileObject)
  ├─ Panggil: useCreateSurat() mutation hook
  │
  ↓
customFetch (custom-fetch.ts)
  │
  ├─ Tambah header Authorization: Bearer <token>
  ├─ Kirim: POST /api/surat
  │   Content-Type: multipart/form-data (otomatis oleh browser)
  │   Body: FormData dengan semua field + file
  │
  ↓
API Server (routes/surat.ts → POST /)
  │
  ├─ Multer middleware:
  │   ├─ Terima file dari request
  │   ├─ Validasi tipe file (PDF, PNG, JPG)
  │   ├─ Validasi ukuran (<= 10MB)
  │   └─ Simpan file ke: artifacts/api-server/uploads/<timestamp>-<namafile>
  │
  ├─ Validasi field wajib (nomor, perihal, dst)
  │
  ├─ Insert ke PostgreSQL:
  │   INSERT INTO surat
  │     (nomor_surat, perihal, pengirim, penerima, jenis,
  │      tanggal_surat, keterangan, nama_file, created_by_id)
  │   VALUES ('001/SK/I/2026', 'Undangan Rapat', ..., '1735000000000-dok.pdf', 1)
  │   RETURNING *
  │
  └─ Return: { id: 9, nomorSurat: "001/SK/I/2026", ..., urlFile: "/api/uploads/1735...-dok.pdf" }
  │
  ↓
Frontend (surat-create.tsx)
  │
  ├─ TanStack Query: invalidate cache getSuratList
  ├─ Tampilkan toast "Surat berhasil dibuat"
  └─ Redirect ke /surat
```

### 4. Download File Surat

```
Frontend
  │
  ├─ User klik tombol "Download File" di halaman detail surat
  ├─ URL: /api/uploads/<namaFile>
  │
  ↓
API Server (routes/index.ts)
  │
  ├─ Route: router.use("/uploads", express.static(uploadsDir))
  └─ Express melayani file statis dari folder uploads/ langsung ke browser
```

---

## Endpoint API

| Method | Endpoint                  | Auth | Deskripsi                          |
|--------|---------------------------|------|------------------------------------|
| GET    | /api/healthz              | No   | Health check                       |
| POST   | /api/auth/login           | No   | Login, return JWT token            |
| GET    | /api/auth/me              | JWT  | Ambil profil user saat ini         |
| GET    | /api/surat                | JWT  | Daftar surat (filter, pagination)  |
| POST   | /api/surat                | JWT  | Buat surat baru + upload file      |
| GET    | /api/surat/:id            | JWT  | Detail surat by ID                 |
| DELETE | /api/surat/:id            | JWT  | Hapus surat (admin only)           |
| GET    | /api/dashboard/stats      | JWT  | Statistik ringkasan dashboard      |
| GET    | /api/dashboard/recent     | JWT  | 10 surat terbaru                   |
| GET    | /api/uploads/:filename    | No   | Akses file yang diupload           |

---

## Cara Menjalankan (Development)

Kedua service akan otomatis berjalan di Replit. Jika perlu restart manual:

```bash
# Start API Server
pnpm --filter @workspace/api-server run dev

# Start Frontend
pnpm --filter @workspace/persuratan run dev
```

### Menambah Data Surat via API (cURL)

```bash
# Login dulu untuk dapatkan token
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff","password":"password"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Ambil daftar surat masuk
curl -H "Authorization: Bearer $TOKEN" "http://localhost/api/surat?jenis=masuk"

# Buat surat baru (tanpa file)
curl -X POST http://localhost/api/surat \
  -H "Authorization: Bearer $TOKEN" \
  -F "nomorSurat=TEST/001/2026" \
  -F "perihal=Test Surat" \
  -F "pengirim=Pengirim Test" \
  -F "penerima=Penerima Test" \
  -F "jenis=masuk" \
  -F "tanggalSurat=2026-01-01"
```

---

## Pola Coding (Clean Architecture Sederhana)

```
OpenAPI Spec (kontrak)
    ↓ codegen
Generated Hooks & Zod Schemas
    ↓
Frontend (React)          Backend (Express)
    ↓                         ↓
useGetSuratList()    →   Route Handler (routes/surat.ts)
                              ↓
                         authMiddleware (memverifikasi JWT)
                              ↓
                         Drizzle ORM (query builder type-safe)
                              ↓
                         PostgreSQL Database
```

### Prinsip yang Digunakan:
1. **Contract-First API**: OpenAPI spec ditulis lebih dulu, kemudian kode di-generate secara otomatis
2. **Type Safety End-to-End**: Dari database schema (Drizzle) → API response → React hooks, semua menggunakan TypeScript
3. **Separation of Concerns**: Middleware auth terpisah dari business logic route
4. **Single Responsibility**: Setiap file route menangani satu domain (auth, surat, dashboard)
