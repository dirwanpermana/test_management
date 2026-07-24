-- ============================================================
-- migration_004_case_no_per_header.sql
-- Membatalkan pendekatan "case_no acak (UUID+random)" dari migration_003.
-- Case ID sekarang: per-header sequential mulai dari 01, PERMANEN
-- (tidak reindex ulang saat delete — beda dari "No"/displayNo yang
-- memang sengaja auto-reindex di service layer via ROW_NUMBER()).
--
-- Kenapa case_no TIDAK ikut reindex seperti "No":
--   Bug module (bugService.createBug) mencari test case lewat
--   `WHERE case_no = $1`. Kalau case_no ikut berubah saat baris lain
--   dihapus, semua Bug yang sudah terhubung ke case_no lama akan salah
--   sambung. "No" aman untuk reindex karena sifatnya murni tampilan,
--   tidak pernah dipakai sebagai foreign reference.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_before_insert_test_case_item()
RETURNS TRIGGER AS $$
DECLARE
    v_header_seq  INT;
    v_header_code CHAR(6);
BEGIN
    -- Counter per-header (bukan lagi global harian) — supaya tiap header
    -- test case mulai dari 01 sendiri-sendiri.
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

-- Catatan: tabel `test_case_daily_counter` sekarang TIDAK dipakai lagi oleh
-- test_case_items (pola sama seperti bug_status_transitions — data dibiarkan,
-- keputusan hapus/tidak menyusul).

-- OPSIONAL — backfill data existing supaya ikut format baru (01, 02, dst per header):
-- DO $$
-- DECLARE r RECORD; v_seq INT;
-- BEGIN
--   FOR r IN SELECT DISTINCT header_id FROM test_case_items LOOP
--     v_seq := 0;
--     UPDATE test_case_items ti
--     SET seq_no = sub.new_seq,
--         case_no = (SELECT header_code FROM test_case_headers WHERE id = r.header_id)
--                    || '-' || lpad(sub.new_seq::text, 2, '0')
--     FROM (
--       SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS new_seq
--       FROM test_case_items WHERE header_id = r.header_id
--     ) sub
--     WHERE ti.id = sub.id;
--   END LOOP;
-- END $$;