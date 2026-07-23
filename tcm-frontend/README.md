# TCM Frontend — Test Case Management (Mock-first)

Implementasi frontend dari rancangan di `rancangan-tcm-system.md` (ERD, PostgreSQL DDL, REST API design). Project ini **berjalan mandiri tanpa backend** — semua endpoint di-mock dengan MSW (Mock Service Worker) sehingga persis meniru kontrak API yang nanti akan dibuat di backend PHP/Laravel + PostgreSQL.

## 1. Prasyarat

- Node.js 18+ (disarankan 20/22 LTS) — cek dengan `node -v`
- npm 9+ — cek dengan `npm -v`

## 2. Instalasi (dari nol)

```bash
cd tcm-frontend
npm install
```

## 3. Menjalankan Aplikasi (Development)

```bash
npm run dev
```

Buka `http://localhost:5173`. Aplikasi otomatis start MSW (`enableMocking()` di `src/main.tsx`) — buka DevTools Network tab, request ke `/api/...` akan terlihat "(from service worker)".

### Akun mock (password sama untuk semua: `password123`)

| Username | Role | Nama |
|---|---|---|
| qa1 | QA | Siti (QA) |
| qa2 | QA | Andi (QA) |
| dev1 | DEV | Budi (Dev FE) |
| dev2 | DEV | Rani (Dev BE) |

## 4. Build Production

```bash
npm run build      # tsc -b && vite build -> output di dist/
npm run preview     # serve hasil build untuk verifikasi lokal
```

## 5. Struktur Proyek

```
src/
├── api/            axios client + fungsi panggilan tiap modul (testCaseApi, bugApi, monitoringApi, authApi)
├── auth/            AuthContext, useAuth, PrivateRoute (wajib login), RoleGuard (proteksi per role)
├── components/
│   ├── layout/     Sidebar, Topbar, AppLayout (shell menu)
│   └── ui/         StatusBadge, ConfirmDialog (komponen reusable)
├── features/
│   ├── auth/       LoginPage
│   ├── test-cases/ Menu 1: Create Form, editable grid (ag-Grid), hooks react-query
│   ├── bugs/       Menu 2: Create Form, list, detail drawer (komentar + status transition)
│   └── monitoring/ Menu 3: dashboard test case & bug
├── mocks/          seed data + MSW handlers (pengganti backend sementara)
└── types/          interface TypeScript, mirror 1:1 dengan skema PostgreSQL di dokumen rancangan
```

## 6. Cara Kerja Fitur Utama

- **Auto ID Test Case (`260722-01`)**: dibuat di `src/mocks/handlers.ts` (fungsi `nextSeq` + `todayCode`), meniru trigger PostgreSQL `fn_before_insert_test_case_item` di dokumen rancangan (numbering **global per hari**, lihat asumsi A1).
- **Auto Nomor Bug (`BUG-260722-01`)**: sama polanya, di endpoint `POST /api/bugs`.
- **RBAC**: `RoleGuard` menyembunyikan UI berdasarkan role (UX saja). Validasi sesungguhnya tetap dilakukan di mock handler (mis. `PATCH /api/bugs/:id/status` menolak dengan HTTP 403 kalau role tidak sesuai `bugStatusTransitions`). Saat backend asli dibuat, logic 403 ini **harus dipindah ke middleware backend**, bukan hanya di frontend.
- **Grid "seperti Excel"**: `ag-Grid Community` di `TestCaseGrid.tsx` — klik cell untuk edit inline, dropdown untuk `Test Type` & `Status`.

## 7. Menghubungkan ke Backend Asli (Next Step)

1. Implementasikan REST API sesuai §4.1 dokumen rancangan (PHP/Laravel direkomendasikan, konsisten dengan stack backend yang ada) di atas schema PostgreSQL §3.
2. Hapus/nonaktifkan `enableMocking()` di `src/main.tsx` (atau bungkus dengan `if (import.meta.env.DEV)`).
3. Set `baseURL` di `src/api/axiosClient.ts` ke URL backend asli, dan pastikan CORS + JWT signing sudah benar di server.
4. Ganti mock token base64 dengan JWT asli dari backend — struktur payload sudah kompatibel (`sub`, `role`).

## 8. Verifikasi yang Sudah Dilakukan

- `npx tsc -b` — 0 error (strict mode: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`)
- `npm run build` — build production sukses (lihat catatan bundle size ag-Grid di bawah)
- `npx oxlint src` — 0 error, 1 warning kosmetik (fast-refresh di `AuthContext.tsx`, tidak berdampak fungsional)
- `vite preview` — HTML, asset, dan `mockServiceWorker.js` ter-serve dengan benar

**Belum diverifikasi** (perlu dilakukan manual di browser lokal Anda, karena sandbox ini tidak punya akses download Chromium untuk automated headless test): flow end-to-end klik-per-klik (login → create test case → create bug → ubah status → monitoring). Sangat disarankan setelah `npm run dev`, jalankan smoke test manual atau tulis test Playwright (sudah ada di stack automation Anda) yang meng-cover 4 menu ini.

**Catatan bundle size**: `ag-grid` menyumbang chunk >500kB. Untuk production nanti, pertimbangkan `React.lazy()` untuk route `/test-cases` agar ag-Grid tidak ikut ke initial bundle.
