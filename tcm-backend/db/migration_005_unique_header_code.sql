-- ============================================================
-- migration_005_unique_header_code.sql
-- header_code sebelumnya cuma tanggal (YYMMDD) tanpa komponen unik —
-- 2 test case dibuat hari sama akan collide, dan berimbas ke case_no
-- (UNIQUE constraint) karena seq_no di-reset per header sejak migration_004.
-- ============================================================

-- 1) Perlebar kolom dulu (CHAR(6) tidak cukup untuk "YYMMDD-NN")
ALTER TABLE test_case_headers ALTER COLUMN header_code TYPE VARCHAR(12);

-- 2) Backfill data existing SUPAYA UNIK dulu, sebelum constraint UNIQUE
--    dipasang (kalau tidak, ALTER TABLE ADD CONSTRAINT akan gagal karena
--    sudah ada duplikat, persis 2 baris di screenshot kalian).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, header_code,
           ROW_NUMBER() OVER (PARTITION BY header_code ORDER BY created_at) AS rn
    FROM test_case_headers
  LOOP
    UPDATE test_case_headers
    SET header_code = header_code || '-' || lpad(r.rn::text, 2, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 3) Pasang UNIQUE constraint — pengaman terakhir di level DB, terlepas
--    dari logic trigger di bawah (defense in depth).
ALTER TABLE test_case_headers
  ADD CONSTRAINT test_case_headers_header_code_key UNIQUE (header_code);

-- 4) Trigger baru: header_code = tanggal + nomor urut HARIAN (bukan lagi
--    cuma tanggal polos). test_case_daily_counter dipakai lagi di sini
--    (sebelumnya untuk item, sekarang untuk header — lebih pas secara makna).
CREATE OR REPLACE FUNCTION fn_set_header_code()
RETURNS TRIGGER AS $$
DECLARE
    v_seq INT;
BEGIN
    INSERT INTO test_case_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = test_case_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    NEW.header_code := to_char(now(), 'YYMMDD') || '-' || lpad(v_seq::text, 2, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;