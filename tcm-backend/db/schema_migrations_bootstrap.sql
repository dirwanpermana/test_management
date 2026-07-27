-- ============================================================
-- schema_migrations_bootstrap.sql
--
-- Jalankan SEKALI di setiap environment (local, Railway/production, dst)
-- yang migration_002 s/d migration_010-nya SUDAH pernah dijalankan
-- manual (seperti local Anda sekarang). Ini hanya membuat tabel
-- tracking + "menandai" migration yang sudah selesai, TIDAK menjalankan
-- ulang isi migration-nya.
--
-- Untuk environment BARU (fresh database, mis. Railway yang belum
-- pernah di-migrate sama sekali): JANGAN jalankan file ini. Cukup
-- jalankan `npm run db:migrate` (setelah migrate.ts di-upgrade) — dia
-- akan otomatis membuat tabel ini DAN menjalankan semua migration yang
-- belum tercatat, dari nol, berurutan.
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    VARCHAR(255) PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tandai migration yang sudah kita jalankan manual hari ini di local.
-- Sesuaikan daftar ini kalau ada file yang BELUM sempat Anda jalankan
-- (mis. kalau migration_009_notes.sql ternyata belum pernah dijalankan,
-- hapus baris itu dari INSERT ini supaya migrate.ts nanti menjalankannya).
INSERT INTO schema_migrations (filename) VALUES
    ('migration_002_sprint_severity_priority.sql'),
    ('migration_003_test_case_grid_enhancements.sql'),
    ('migration_004_case_no_per_header.sql'),
    ('migration_005_unique_header_code.sql'),
    ('migration_007_monitoring_updates.sql'),
    ('migration_008_monitoring_created_date.sql'),
    ('migration_009_notes.sql'),
    ('migration_010_fix_case_no_and_trigger_width.sql')
ON CONFLICT (filename) DO NOTHING;