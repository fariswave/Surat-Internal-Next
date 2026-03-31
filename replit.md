# Workspace — Aplikasi Persuratan Internal

## Overview

pnpm workspace monorepo menggunakan TypeScript. Aplikasi persuratan internal (surat masuk/keluar) dengan backend Express.js dan frontend React + Vite.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, TanStack Query, Wouter (routing)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Code First)
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **File Upload**: Multer (simpan ke `/uploads`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (dari OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Struktur

```text
workspace/
├── artifacts/
│   ├── api-server/         # Backend Express.js
│   │   ├── src/
│   │   │   ├── middlewares/auth.ts  # JWT middleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Login, /me
│   │   │   │   ├── surat.ts     # CRUD surat + upload
│   │   │   │   └── dashboard.ts # Stats & recent
│   │   │   ├── app.ts       # Express setup
│   │   │   └── index.ts     # Entry point
│   │   └── uploads/         # File fisik surat tersimpan di sini
│   │
│   └── persuratan/         # Frontend React + Vite (served at /)
│       └── src/
│           ├── pages/       # Halaman-halaman aplikasi
│           ├── lib/auth.ts  # Token management
│           └── App.tsx      # Router + ProtectedRoute
│
├── lib/
│   ├── api-spec/openapi.yaml    # Kontrak API
│   ├── api-client-react/        # Generated React Query hooks
│   │   └── src/custom-fetch.ts  # Fetch dengan JWT injection
│   ├── api-zod/                 # Generated Zod schemas
│   └── db/src/schema/
│       ├── users.ts     # Tabel users
│       └── surat.ts     # Tabel surat
└── README.md            # Dokumentasi lengkap + alur data
```

## User Dummy (semua password: "password")

| Username | Role    |
|----------|---------|
| admin    | admin   |
| staff    | staff   |
| manager  | manager |

## Commands Penting

```bash
# Codegen (setelah ubah openapi.yaml)
pnpm --filter @workspace/api-spec run codegen

# Push schema ke database
pnpm --filter @workspace/db run push

# Build backend
pnpm --filter @workspace/api-server run build
```

## TypeScript & Composite Projects

- `lib/*` packages adalah composite dan emit declarations via `tsc --build`
- `artifacts/*` adalah leaf packages, dicek dengan `tsc --noEmit`
- Root `tsconfig.json` adalah solution file untuk libs saja

## Proxy & Routing

- Frontend: `/` → port 18182
- API: `/api` → port 8080
- File upload: `/api/uploads/<filename>` → served statis dari `/uploads/`

## Fitur

- Login dengan JWT (3 role: admin, staff, manager)
- Dashboard: statistik total surat, masuk, keluar, minggu ini, bulan ini
- Daftar surat dengan filter (masuk/keluar) dan search
- Form buat surat dengan upload file (PDF/gambar, max 10MB)
- Detail surat dengan link download file
- Hapus surat (admin only)
- 8 contoh data surat dummy sudah tersedia
