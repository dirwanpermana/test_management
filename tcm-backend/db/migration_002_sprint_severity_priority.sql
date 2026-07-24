-- ============================================================
-- Migration 002 — Sprint field, Bug severity/priority, dan
-- perluasan status bug (Open, On Progress Dev, Ready to Test, On Progress QA, Reopen, Close, Take Out, Hold).
-- Jalankan ini SEKALI terhadap database yang SUDAH ada datanya
-- (schema.sql tidak akan meng-ALTER tabel yang sudah dibuat,
-- karena semua CREATE TABLE di sana pakai IF NOT EXISTS).
--
-- Cara pakai:
--   psql -U postgres -d tcm -f db/migration_002_sprint_severity_priority.sql
-- ============================================================

BEGIN;

-- 1. Kolom Sprint di test_case_headers -------------------------------------
ALTER TABLE test_case_headers ADD COLUMN IF NOT EXISTS sprint VARCHAR(50);

-- 1b. Fix FK bugs.test_case_item_id — sebelumnya tanpa ON DELETE, jadi
--     menghapus test_case_header (yang cascade ke test_case_items) akan
--     gagal kalau ada bug yang tertaut. Sekarang bug tetap ada, hanya
--     referensinya yang di-null-kan (testCaseNo di frontend akan tampil '-').
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_test_case_item_id_fkey;
ALTER TABLE bugs ADD CONSTRAINT bugs_test_case_item_id_fkey
  FOREIGN KEY (test_case_item_id) REFERENCES test_case_items(id) ON DELETE SET NULL;

-- 2. Kolom Severity & Priority di bugs -------------------------------------
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'Medium';
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'Medium';

DO $$ BEGIN
  ALTER TABLE bugs ADD CONSTRAINT bugs_severity_check
    CHECK (severity IN ('Critical','Major','Medium','Low'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bugs ADD CONSTRAINT bugs_priority_check
    CHECK (priority IN ('Critical','High','Medium','Low'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Perluasan status bug ---------------------------------------------------
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_status_check;
-- Map data lama supaya tidak melanggar CHECK constraint baru:
--   'Closed'   -> 'Close'    (nama status baru untuk kondisi yang sama)
--   'Rejected' -> 'Take Out' (bug invalid/duplikat, ditarik dari daftar aktif)
UPDATE bugs SET status = 'Close' WHERE status = 'Closed';
UPDATE bugs SET status = 'Take Out' WHERE status = 'Rejected';

ALTER TABLE bugs ADD CONSTRAINT bugs_status_check
  CHECK (status IN (
    'Open', 'On Progress Dev', 'Ready to Test', 'On Progress QA',
    'Reopen', 'Close', 'Take Out', 'Hold'
  ));


-- 4. Refresh matrix bug_status_transitions ---------------------------------
-- ASUMSI alur (perlu dikonfirmasi ke stakeholder — sama seperti asumsi lain
-- di rancangan-tcm-system.md):
--   Open -> On Progress Dev (DEV) -> Ready to Test (DEV) -> On Progress QA (QA)
--         -> Close (QA) / Reopen (QA) -> On Progress Dev (DEV, ulang)
--   Open -> Hold / Take Out (QA); Hold -> Open (QA, lanjutkan lagi)
TRUNCATE bug_status_transitions;
INSERT INTO bug_status_transitions (from_status, to_status, allowed_role) VALUES
    ('Open',             'On Progress Dev', 'DEV'),
    ('Open',             'Hold',            'QA'),
    ('Open',             'Take Out',        'QA'),
    ('On Progress Dev',  'Ready to Test',   'DEV'),
    ('On Progress Dev',  'Hold',            'DEV'),
    ('Ready to Test',    'On Progress QA',  'QA'),
    ('On Progress QA',   'Close',           'QA'),
    ('On Progress QA',   'Reopen',          'QA'),
    ('Reopen',           'On Progress Dev', 'DEV'),
    ('Hold',             'Open',            'QA');

COMMIT;
