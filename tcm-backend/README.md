# TCM Backend — Test Case Management API

Backend TypeScript (Node.js + Express) untuk aplikasi Test Case Management, mengimplementasikan REST API & skema PostgreSQL dari `rancangan-tcm-system.md`. **Bukan PHP** — sesuai permintaan, seluruh backend ini TypeScript.

## 1. Tech Stack

- Node.js + Express 5 (REST API)
- PostgreSQL (raw SQL via `pg`, tanpa ORM — supaya trigger/plpgsql dari dokumen rancangan dipakai apa adanya)
- `jsonwebtoken` + `bcryptjs` untuk auth
- `zod` untuk validasi payload
- `tsx` untuk dev server dengan hot-reload

## 2. Prasyarat

- Node.js 18+
- PostgreSQL 14+ berjalan lokal (paling gampang lewat Docker):

```bash
docker compose up -d
```

atau install PostgreSQL native di mesin Anda dan buat database `tcm` manual.

## 3. Setup (dari nol)

```bash
cd tcm-backend
npm install
cp .env.example .env
# edit .env kalau perlu (DATABASE_URL, JWT_SECRET, dst)

npm run db:migrate   # menjalankan db/schema.sql (tabel, trigger, view)
npm run db:seed      # membuat 4 user mock (password: password123)

npm run dev          # start server di http://localhost:4000
```

### Akun setelah seed

| Username | Role | Password |
|---|---|---|
| qa1, qa2 | QA | password123 |
| dev1, dev2 | DEV | password123 |

## 4. Verifikasi Otomatis (sudah dijalankan di sandbox saat development)

```bash
npm test
```

`npm test` menjalankan `src/test/smoke.ts`: boot **PGlite** (real Postgres, compiled ke WASM, jalan in-memory tanpa perlu instalasi apapun) via `@electric-sql/pglite-socket`, apply `db/schema.sql`, lalu hit 24 skenario lewat `supertest` langsung ke Express app — bukan mock. Cakupan:

- Login sukses/gagal, JWT
- RBAC 403: DEV tidak bisa create test case header / edit item / close bug; QA tidak bisa langsung `Open -> Ready to Test`
- Auto-numbering `case_no` (`260722-01`, `-02`, ...) dan `bug_no` (`BUG-260722-01`) lewat trigger PostgreSQL asli
- State machine bug penuh: `Open -> Ready to Test -> Closed`, tercatat 3 baris di `bug_status_history`
- Komentar bug
- View monitoring (`v_test_case_monitoring`, `v_bug_monitoring`) — persentase & kategori
- Endpoint tanpa token ditolak 401

Semua 24 assertion **PASS** pada environment development.

**Bug yang ketemu & sudah diperbaiki lewat proses ini:** `COUNT(*)` dan `ROUND(...)` di PostgreSQL mengembalikan tipe `bigint`/`numeric`, dan driver `pg` mem-parsingnya sebagai **string** di Node (bukan number) untuk menghindari presisi hilang. Ini akan membuat frontend (`totalCase: number`) salah render kalau tidak di-cast. Sudah diperbaiki di `db/schema.sql` dengan `::int` / `::float8` pada view monitoring. Ini contoh nyata kenapa smoke test terhadap Postgres asli (bukan cuma mock) penting.

## 5. Struktur Proyek

```
db/
  schema.sql          semua tabel, trigger, function, view (lihat §3 dokumen rancangan)
src/
  db/
    pool.ts           koneksi pg Pool
    migrate.ts        runner untuk schema.sql
    seed.ts           seed 4 user mock
  middleware/
    auth.ts           authenticate (verify JWT) + requireRole + signToken
    asyncHandler.ts   wrapper supaya error di async handler diteruskan ke error middleware
  services/           query SQL per domain (testCaseService, bugService, userService)
  routes/             route Express per modul (auth, testCases, bugs, monitoring)
  test/
    smoke.ts          verifikasi end-to-end terhadap PGlite (lihat §4)
  app.ts              Express app assembly (dipisah dari index.ts supaya bisa dites via supertest)
  index.ts            entrypoint (app.listen)
```

## 6. Endpoint (mengikuti §4.1 dokumen rancangan)

| Method | Endpoint | Role |
|---|---|---|
| POST | `/api/auth/login` | Public |
| GET | `/api/users?role=DEV` | Authenticated |
| GET/POST | `/api/test-case-headers` | GET: semua, POST: QA |
| GET | `/api/test-case-items?headerId=` | Authenticated |
| POST | `/api/test-case-headers/:headerId/items` | QA |
| PUT/DELETE | `/api/test-case-items/:id` | QA |
| GET/POST | `/api/bugs` | GET: semua, POST: QA |
| GET | `/api/bugs/:id` | Authenticated (+comments+history) |
| PATCH | `/api/bugs/:id/status` | Role-aware, divalidasi dari tabel `bug_status_transitions` |
| POST | `/api/bugs/:id/comments` | Authenticated |
| GET | `/api/monitoring/test-cases` | Authenticated |
| GET | `/api/monitoring/bugs` | Authenticated |

Semua endpoint (kecuali `/auth/login`) butuh header `Authorization: Bearer <token>`.

## 7. Menghubungkan ke Frontend (tcm-frontend)

1. Jalankan backend ini (`npm run dev`, default port 4000).
2. Di project `tcm-frontend`, buka `src/main.tsx` dan **hapus/nonaktifkan** blok `enableMocking()` (atau bungkus dengan `if (import.meta.env.DEV) { ... }` kalau masih mau pakai mock untuk demo tanpa backend).
3. Di `src/api/axiosClient.ts`, ganti `baseURL: '/api'` menjadi `baseURL: 'http://localhost:4000/api'` (atau pasang proxy di `vite.config.ts`).
4. Login memakai akun di §3 — token JWT asli dari backend ini akan dipakai, bukan mock token base64.

## 8. Yang Masih Perlu Dikerjakan Sebelum Production

- Upload dokumen/attachment: endpoint `attachments` belum diimplementasi (skema tabel sudah ada di `db/schema.sql`, tinggal tambah route + storage — S3/MinIO/local disk, sesuai keputusan di dokumen rancangan §7.3).
- Refresh token: saat ini hanya access token (short-lived). Refresh token + revocation list belum diimplementasikan.
- Rate limiting & helmet (security headers) belum dipasang — tambahkan sebelum deploy publik.
- Migration tool: `db:migrate` saat ini hanya re-run `schema.sql` (idempotent lewat `IF NOT EXISTS`/`ON CONFLICT`), belum versioned migration. Untuk tim besar, pertimbangkan `node-pg-migrate` atau `Prisma Migrate`.
