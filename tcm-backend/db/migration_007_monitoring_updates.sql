-- ============================================================
-- migration_007_monitoring_updates.sql
-- - Kolom baru di v_test_case_monitoring: sprint, nama_menu, jira_url
--   (ditaruh di AKHIR select list — CREATE OR REPLACE VIEW tidak boleh
--   menyisipkan kolom baru di tengah, hanya boleh menambah di akhir)
-- - Logic "category" diperketat: Complete = SEMUA baris berstatus Pass
--   (sebelumnya: Fail/Blocked juga dihitung "selesai")
-- ============================================================

CREATE OR REPLACE VIEW v_test_case_monitoring AS
SELECT
    h.id                                            AS header_id,
    h.header_code,
    h.nama_test_case,
    COUNT(i.id)::int                                AS total_case,
    COUNT(i.id) FILTER (WHERE i.status IN ('Pass','Fail','Blocked'))::int AS executed_case,
    (ROUND(
        100.0 * COUNT(i.id) FILTER (WHERE i.status IN ('Pass','Fail','Blocked'))
        / NULLIF(COUNT(i.id), 0), 2
    ))::float8                                       AS percentage,
    CASE
        -- Prioritas 1: ada baris di-Hold -> seluruh test case dianggap On Hold,
        -- tidak peduli progress baris lain.
        WHEN COUNT(i.id) FILTER (WHERE i.status = 'On Hold') > 0 THEN 'Hold'
        -- Prioritas 2: SEMUA baris (bukan cuma "executed") harus Pass.
        WHEN COUNT(i.id) FILTER (WHERE i.status = 'Pass') = COUNT(i.id)
             AND COUNT(i.id) > 0 THEN 'Complete'
        -- Sisanya (termasuk ada Fail/Blocked/Not Executed) -> On Progress.
        ELSE 'On Progress'
    END                                              AS category,
    string_agg(DISTINCT u.full_name, ', ')           AS pic_qa_names,
    h.sprint,
    h.nama_menu,
    h.jira_url
FROM test_case_headers h
LEFT JOIN test_case_items i ON i.header_id = h.id
LEFT JOIN users u ON u.id = i.pic_qa
GROUP BY h.id, h.header_code, h.nama_test_case, h.sprint, h.nama_menu, h.jira_url;