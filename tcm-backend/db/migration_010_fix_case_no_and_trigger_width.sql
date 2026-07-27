-- ============================================================
-- migration_010_fix_case_no_and_trigger_width.sql
--
-- Root cause: migration_005 memperlebar header_code jadi VARCHAR(12)
-- ("YYMMDD-NN", bisa sampai 12 char kalau kena backfill dedup tambahan),
-- tapi 2 tempat turunannya TIDAK ikut diperlebar:
--
--   1) fn_before_insert_test_case_item() (dibuat migration_004) punya
--      variable lokal `v_header_code CHAR(6)` — assignment header_code
--      9-12 karakter ke variable ini SELALU gagal:
--        "value too long for type character(6)"
--
--   2) Kolom test_case_items.case_no (schema.sql) masih VARCHAR(9),
--      padahal hasil concat sekarang bisa "header_code + '-' + 2 digit
--      seq" = sampai 15 karakter.
--
-- Efek: create test case item (termasuk auto-seed 10 baris kosong di
-- frontend saat header baru dibuka) gagal 100%, silent di UI ("No Rows
-- To Show" tanpa pesan error, karena auto-seed di-catch diam-diam).
--
-- Aman dijalankan ulang (idempotent): ALTER COLUMN TYPE ke tipe yang
-- sama adalah no-op, CREATE OR REPLACE FUNCTION selalu aman.
-- ============================================================

BEGIN;

-- 1) Perlebar case_no. Constraint UNIQUE (dari schema.sql) ikut otomatis,
--    tidak perlu drop-recreate.
ALTER TABLE test_case_items ALTER COLUMN case_no TYPE VARCHAR(20);

-- 2) Perbaiki variable v_header_code yang terlalu sempit di trigger function.
CREATE OR REPLACE FUNCTION fn_before_insert_test_case_item()
RETURNS TRIGGER AS $$
DECLARE
    v_header_seq  INT;
    v_header_code VARCHAR(12);  -- FIX: sebelumnya CHAR(6), truncate error
BEGIN
    SELECT COALESCE(MAX(seq_no), 0) + 1 INTO v_header_seq
    FROM test_case_items
    WHERE header_id = NEW.header_id;

    SELECT header_code INTO v_header_code
    FROM test_case_headers WHERE id = NEW.header_id;

    NEW.seq_no  := v_header_seq;
    NEW.case_no := v_header_code || '-' || lpad(v_header_seq::text, 2, '0');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;