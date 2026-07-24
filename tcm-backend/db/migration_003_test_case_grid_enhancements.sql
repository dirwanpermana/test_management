-- ============================================================
-- migration_003_test_case_grid_enhancements.sql
-- ============================================================

-- 1) dev_area: FE/BE -> Backend/Frontend, direpsosisi jadi kolom "PIC Dev".
--    URUTAN WAJIB: perlebar tipe kolom DULU (biar muat "Frontend"/"Backend"),
--    baru update data, baru pasang constraint baru. (pelajaran dari migration_002)
ALTER TABLE test_case_items DROP CONSTRAINT IF EXISTS test_case_items_dev_area_check;
ALTER TABLE test_case_items ALTER COLUMN dev_area TYPE VARCHAR(20) USING dev_area::varchar(20);

UPDATE test_case_items SET dev_area = 'Frontend' WHERE dev_area = 'FE';
UPDATE test_case_items SET dev_area = 'Backend'  WHERE dev_area = 'BE';

ALTER TABLE test_case_items ADD CONSTRAINT test_case_items_dev_area_check
  CHECK (dev_area IN ('Backend','Frontend'));

-- Catatan: kolom `pic_dev` (FK ke users) TIDAK dihapus — dibiarkan seperti apa
-- adanya, datanya tidak lagi dipakai di UI "PIC Dev" (sekarang direpresentasikan
-- oleh dev_area). Perlu diputuskan nanti: hapus, atau simpan untuk kebutuhan lain.

-- 2) case_no: dari format "YYMMDD-NN" (predictable/sequential) menjadi
--    identifier acak: 8 char pertama dari id (tanpa dash) + 6 digit angka acak.
--    Unik terjamin karena menempel ke id yang sudah UNIQUE per baris.
CREATE OR REPLACE FUNCTION fn_before_insert_test_case_item()
RETURNS TRIGGER AS $$
DECLARE
    v_seq INT;
BEGIN
    INSERT INTO test_case_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = test_case_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    -- seq_no dipertahankan untuk urutan insert & counter harian global.
    -- Ini BUKAN nomor urut tampilan (lihat displayNo, dihitung di service layer).
    NEW.seq_no  := v_seq;
    NEW.case_no := substr(replace(NEW.id::text, '-', ''), 1, 8)
                   || '-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Nomor urut tampilan (poin 5) SENGAJA TIDAK dibuat sebagai kolom fisik.
--    Kalau disimpan sebagai kolom, setiap delete harus UPDATE semua baris di
--    bawahnya (race condition risk, extra write, dan trigger jadi kompleks).
--    Lebih aman & 100% konsisten: dihitung ulang tiap kali data di-SELECT via
--    ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY seq_no) — otomatis
--    "mengurut ascending lagi" begitu ada baris yang dihapus, tanpa kode
--    tambahan apapun. Lihat ITEM_SELECT di testCaseService.ts.