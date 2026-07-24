import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../db/pool';
import { UPLOAD_DIR } from '../middleware/upload';
import * as XLSX from 'xlsx';
import { listUsersByRole } from './userService';

const HEADER_SELECT = `
  SELECT
    h.id, h.header_code AS "headerCode", h.nama_test_case AS "namaTestCase",
    h.sprint, h.jira_url AS "jiraUrl", h.nama_menu AS "namaMenu",
    h.created_by AS "createdBy", u.full_name AS "createdByName",
    h.created_at AS "createdAt", h.updated_at AS "updatedAt"
  FROM test_case_headers h
  LEFT JOIN users u ON u.id = h.created_by
`;

export async function listHeaders() {
  const { rows } = await pool.query(`${HEADER_SELECT} ORDER BY h.created_at DESC`);
  return rows;
}

export async function createHeader(input: {
  namaTestCase: string; sprint?: string; jiraUrl?: string; namaMenu: string; createdBy: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO test_case_headers (nama_test_case, sprint, jira_url, nama_menu, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.namaTestCase, input.sprint ?? null, input.jiraUrl ?? null, input.namaMenu, input.createdBy],
  );
  const { rows: full } = await pool.query(`${HEADER_SELECT} WHERE h.id = $1`, [rows[0].id]);
  return full[0];
}

export async function updateHeader(id: string, input: Partial<{
  namaTestCase: string; sprint: string; jiraUrl: string; namaMenu: string;
}>) {
  const fieldMap: Record<string, string> = {
    namaTestCase: 'nama_test_case', sprint: 'sprint', jiraUrl: 'jira_url', namaMenu: 'nama_menu',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in input) {
      sets.push(`${column} = $${idx}`);
      values.push((input as Record<string, unknown>)[key]);
      idx += 1;
    }
  }
  if (sets.length === 0) {
    const { rows } = await pool.query(`${HEADER_SELECT} WHERE h.id = $1`, [id]);
    return rows[0] ?? null;
  }
  sets.push('updated_at = now()');
  values.push(id);
  await pool.query(`UPDATE test_case_headers SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  const { rows } = await pool.query(`${HEADER_SELECT} WHERE h.id = $1`, [id]);
  return rows[0] ?? null;
}

// BARU — hapus attachment (row + file fisik di disk) untuk sekumpulan
// test_case_item sekaligus. Dipakai oleh deleteItem (1 item) dan deleteHeader
// (banyak item lewat cascade) supaya tidak ada file/row yatim tertinggal.
async function deleteAttachmentsForItems(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;

  const { rows } = await pool.query<{ fileUrl: string }>(
    `SELECT file_url AS "fileUrl" FROM attachments
     WHERE attachable_type = 'test_case_item' AND attachable_id = ANY($1::uuid[])`,
    [itemIds],
  );

  await pool.query(
    `DELETE FROM attachments
     WHERE attachable_type = 'test_case_item' AND attachable_id = ANY($1::uuid[])`,
    [itemIds],
  );

  // Best-effort hapus file fisik dari disk — tidak melempar error kalau file
  // sudah tidak ada (mis. sempat dihapus manual), tidak blocking response.
  for (const row of rows) {
    const filename = row.fileUrl?.split('/uploads/')[1];
    if (filename) fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
  }
}

export async function deleteHeader(id: string): Promise<boolean> {
  // Ambil dulu semua item di bawah header ini SEBELUM dihapus, supaya
  // attachment-nya bisa dibersihkan — FK cascade test_case_items.header_id
  // hanya tahu soal test_case_items, tidak tahu-menahu soal attachments
  // (yang nempel lewat attachable_id generik, bukan FK sungguhan).
  const { rows: items } = await pool.query<{ id: string }>(
    'SELECT id FROM test_case_items WHERE header_id = $1',
    [id],
  );
  await deleteAttachmentsForItems(items.map((r) => r.id));

  const result = await pool.query('DELETE FROM test_case_headers WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// displayNo dihitung via window function — lihat catatan di migration_003.
const ITEM_SELECT = `
  SELECT
    i.id, i.header_id AS "headerId", i.case_no AS "caseNo", i.seq_no AS "seqNo",
    ROW_NUMBER() OVER (PARTITION BY i.header_id ORDER BY i.seq_no)::int AS "displayNo",
    i.feature_name AS "featureName", i.test_type AS "testType", i.scenario, i.steps,
    i.test_data AS "testData", i.expected_result AS "expectedResult", i.status,
    i.pic_qa AS "picQa", qa.full_name AS "picQaName",
    i.test_date::text AS "testDate", i.note,
    i.dev_area AS "devArea",
    cap.id AS "captureId", cap.file_url AS "captureUrl", cap.file_name AS "captureFileName",
    i.created_at AS "createdAt", i.updated_at AS "updatedAt"
  FROM test_case_items i
  LEFT JOIN users qa ON qa.id = i.pic_qa
  LEFT JOIN LATERAL (
    SELECT id, file_url, file_name
    FROM attachments a
    WHERE a.attachable_type = 'test_case_item' AND a.attachable_id = i.id
    ORDER BY a.uploaded_at DESC
    LIMIT 1
  ) cap ON true
`;

export async function listItems(headerId?: string) {
  const { rows } = await pool.query(
    `${ITEM_SELECT} ${headerId ? 'WHERE i.header_id = $1' : ''} ORDER BY i.header_id, i.seq_no`,
    headerId ? [headerId] : [],
  );
  return rows;
}

export async function findItemById(id: string) {
  const { rows } = await pool.query('SELECT id FROM test_case_items WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createItem(headerId: string, input: {
  featureName: string; testType: string; scenario: string; steps: string;
  testData?: string | null; expectedResult: string; status?: string; picQa: string;
  testDate?: string | null; note?: string | null; devArea?: string | null;
}) {
  const { rows } = await pool.query(
    `INSERT INTO test_case_items
       (header_id, feature_name, test_type, scenario, steps, test_data, expected_result,
        status, pic_qa, test_date, note, dev_area)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Not Executed'),$9,$10,$11,$12)
     RETURNING id`,
    [
      headerId, input.featureName, input.testType, input.scenario, input.steps,
      input.testData ?? null, input.expectedResult, input.status ?? null, input.picQa,
      input.testDate ?? null, input.note ?? null, input.devArea ?? null,
    ],
  );
  const { rows: full } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [rows[0].id]);
  return full[0];
}

export async function updateItem(id: string, input: Partial<{
  featureName: string; testType: string; scenario: string; steps: string;
  testData: string | null; expectedResult: string; status: string; picQa: string | null;
  testDate: string | null; note: string | null; devArea: string | null;
}>) {
  const fieldMap: Record<string, string> = {
    featureName: 'feature_name', testType: 'test_type', scenario: 'scenario', steps: 'steps',
    testData: 'test_data', expectedResult: 'expected_result', status: 'status', picQa: 'pic_qa',
    testDate: 'test_date', note: 'note', devArea: 'dev_area',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in input) {
      sets.push(`${column} = $${idx}`);
      values.push((input as Record<string, unknown>)[key]);
      idx += 1;
    }
  }
  if (sets.length === 0) {
    const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
    return rows[0] ?? null;
  }
  values.push(id);
  await pool.query(`UPDATE test_case_items SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function deleteItem(id: string): Promise<boolean> {
  // Bersihkan attachment (row + file fisik) SEBELUM baris item-nya dihapus.
  await deleteAttachmentsForItems([id]);

  const result = await pool.query('DELETE FROM test_case_items WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function findHeaderById(id: string) {
  const { rows } = await pool.query('SELECT id FROM test_case_headers WHERE id = $1', [id]);
  return rows[0] ?? null;
}

// "Capture" = 1 file per item. Upload baru menggantikan yang lama (bukan menambah list).
export async function replaceCapture(itemId: string, fileUrl: string, fileName: string, uploadedBy: string) {
  const { rows: old } = await pool.query(
    `SELECT file_url AS "fileUrl" FROM attachments
     WHERE attachable_type = 'test_case_item' AND attachable_id = $1`,
    [itemId],
  );
  await pool.query(
    `DELETE FROM attachments WHERE attachable_type = 'test_case_item' AND attachable_id = $1`,
    [itemId],
  );
  await pool.query(
    `INSERT INTO attachments (attachable_type, attachable_id, file_url, file_name, uploaded_by)
     VALUES ('test_case_item', $1, $2, $3, $4)`,
    [itemId, fileUrl, fileName, uploadedBy],
  );

  if (old[0]?.fileUrl) {
    const filename = old[0].fileUrl.split('/uploads/')[1];
    if (filename) fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
  }

  const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [itemId]);
  return rows[0];
}

export async function bulkUpdateItems(items: Array<{ id: string; payload: Record<string, unknown> }>) {
  const fieldMap: Record<string, string> = {
    featureName: 'feature_name', testType: 'test_type', scenario: 'scenario', steps: 'steps',
    testData: 'test_data', expectedResult: 'expected_result', status: 'status', picQa: 'pic_qa',
    testDate: 'test_date', note: 'note', devArea: 'dev_area',
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { id, payload } of items) {
      const sets: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const [key, column] of Object.entries(fieldMap)) {
        if (key in payload) {
          sets.push(`${column} = $${idx}`);
          values.push(payload[key]);
          idx += 1;
        }
      }
      if (sets.length === 0) continue;
      values.push(id);
      // eslint-disable-next-line no-await-in-loop
      await client.query(`UPDATE test_case_items SET ${sets.join(', ')} WHERE id = $${idx}`, values);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


// excel template test case

// Pemetaan header Excel -> field DB. HANYA field ini yang diambil dari file;
// No, Case ID, PIC QA, Test Date, Capture SENGAJA tidak dipetakan — mengikuti
// aturan sistem (auto-generate lewat trigger / default saat import / upload
// manual terpisah), bukan dari isi Excel.
const IMPORT_COLUMN_MAP: Record<string, string> = {
  'Feature Name': 'featureName',
  'Test Type': 'testType',
  'Scenario': 'scenario',
  'Steps': 'steps',
  'Data Test': 'testData',
  'Expected Result': 'expectedResult',
  'Status': 'status',
  'PIC QA': 'picQaRaw', // nama mentah dari Excel, diproses lewat findMatchingQaUserId sebelum disimpan
  'Note': 'note',
  'PIC Dev': 'devArea',
};

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

// Levenshtein distance — jumlah minimum edit (insert/delete/substitute)
// untuk mengubah string a jadi b. Dipakai untuk fuzzy match nama PIC QA
// yang typo (mis. "dhandi" vs "Dhandy") yang tidak akan ketemu lewat
// substring matching biasa.
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // hapus
        dp[i][j - 1] + 1,      // tambah
        dp[i - 1][j - 1] + cost, // ganti
      );
    }
  }
  return dp[m][n];
}

// 0 = sama sekali beda, 1 = identik.
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

// Buang embel-embel role seperti "(QA)"/"(qa)" dari full_name sebelum
// dibandingkan, supaya "Dhandy (QA)" dibandingkan sebagai "dhandy" saja.
function normalizeName(name: string): string {
  return name.replace(/\(.*?\)/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const QA_MATCH_THRESHOLD = 0.7; // 70% mirip — cukup toleran untuk 1-2 huruf typo,
                                  // tapi masih menolak nama yang benar-benar beda


function findMatchingQaUserId(
  rawName: string,
  qaUsers: Array<{ id: string; fullName: string }>,
): string | null {
  const needle = normalizeName(rawName);
  if (!needle) return null;

  let best: { id: string; score: number } | null = null;
  for (const u of qaUsers) {
    const dbName = normalizeName(u.fullName);
    const score = dbName === needle
      ? 1 // exact match, langsung skor tertinggi
      : similarity(needle, dbName);
    if (!best || score > best.score) best = { id: u.id, score };
  }

  if (best && best.score >= QA_MATCH_THRESHOLD) return best.id;
  return null;
}

// validasi template header excel
// Urutan kolom TIDAK harus persis sama, tapi ke-14 nama kolom ini WAJIB ada
// semua di baris header (row 1) file Excel yang diupload.
const EXPECTED_HEADERS = [
  'No', 'Case ID', 'Feature Name', 'Test Type', 'Scenario', 'Steps',
  'Data Test', 'Expected Result', 'Status', 'PIC QA', 'Test Date', 'Note',
  'PIC Dev', 'Capture',
];

export class TemplateValidationError extends Error {
  missing: string[];
  unexpected: string[];
  constructor(missing: string[], unexpected: string[]) {
    super('Format file Excel tidak sesuai template');
    this.name = 'TemplateValidationError';
    this.missing = missing;
    this.unexpected = unexpected;
  }
}

function validateTemplateHeaders(sheet: XLSX.WorkSheet): { missing: string[]; unexpected: string[] } {
  const headerRow = (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as unknown[] | undefined) ?? [];
  const found = headerRow.map((h) => String(h ?? '').trim()).filter((h) => h !== '');
  const foundLower = found.map((h) => h.toLowerCase());
  const expectedLower = EXPECTED_HEADERS.map((h) => h.toLowerCase());

  const missing = EXPECTED_HEADERS.filter((h) => !foundLower.includes(h.toLowerCase()));
  const unexpected = found.filter((h) => !expectedLower.includes(h.toLowerCase()));

  return { missing, unexpected };
}


export async function importItemsFromExcel(
  headerId: string,
  filePath: string,
  importedBy: string,
): Promise<{ inserted: number; skipped: ImportRowError[] }> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Ambil sekali di awal (bukan query per baris) — cukup efisien untuk
  // jumlah baris test case yang wajar per header.
  const qaUsers = (await listUsersByRole('QA')) as Array<{ id: string; fullName: string }>;

  const todayStr = new Date().toISOString().slice(0, 10);
  const skipped: ImportRowError[] = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const raw = rows[i];
    const excelRowNumber = i + 2;

    const payload: Record<string, string> = {};
    for (const [excelHeader, dbField] of Object.entries(IMPORT_COLUMN_MAP)) {
      const value = raw[excelHeader];
      if (value !== undefined && value !== '') payload[dbField] = String(value);
    }

    if (Object.keys(payload).length === 0) continue;

    const matchedQaId = payload.picQaRaw
      ? findMatchingQaUserId(payload.picQaRaw, qaUsers)
      : null;
    const resolvedPicQa = matchedQaId ?? importedBy;

    try {
      // eslint-disable-next-line no-await-in-loop
      await createItem(headerId, {
        featureName: payload.featureName ?? '',
        testType: payload.testType ?? 'Positive',
        scenario: payload.scenario ?? '',
        steps: payload.steps ?? '',
        testData: payload.testData ?? null,
        expectedResult: payload.expectedResult ?? '',
        status: payload.status ?? 'Not Executed',
        picQa: resolvedPicQa,
        testDate: todayStr,
        note: payload.note ?? null,
        devArea: payload.devArea ?? null,
      });
      inserted += 1;
    } catch (err) {
      skipped.push({
        rowNumber: excelRowNumber,
        message: err instanceof Error ? err.message : 'Gagal menyimpan baris ini',
      });
    }
  }

  return { inserted, skipped };
}

// bikin template untuk di unduh
export function generateTemplateWorkbook(): Buffer {
  const sheetData = [
    EXPECTED_HEADERS,
    [
      '', '', 'Contoh: verifikasi login', 'Positive', 'User login dengan kredensial valid',
      '1. Buka halaman login\n2. Isi username & password\n3. Klik tombol Login',
      'username: qa1, password: password123', 'User berhasil masuk ke dashboard',
      'Not Executed', 'Dirwan', '', '', 'Frontend', '',
    ],
  ];
  const wsData = XLSX.utils.aoa_to_sheet(sheetData);
  wsData['!cols'] = EXPECTED_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

  const instructionsData = [
    ['Kolom', 'Keterangan'],
    ['No', 'Nomor urut test case (diabaikan — auto-generate sistem)'],
    ['Case ID', 'ID unik test case (diabaikan — auto-generate sistem)'],
    ['Feature Name', 'Free text'],
    ['Test Type', 'Positive / Negative'],
    ['Scenario', 'Free text'],
    ['Steps', 'Free text (boleh multi-baris)'],
    ['Data Test', 'Free text'],
    ['Expected Result', 'Free text'],
    ['Status', 'Not Executed / Pass / Fail / Blocked / On Hold'],
    ['PIC QA', 'Isi nama QA sesuai yang tersedia di aplikasi — sistem mencocokkan otomatis walau ada typo ringan. Kalau tidak ditemukan kecocokan, otomatis diisi nama Anda (user yang mengupload).'],
    ['Test Date', 'Diabaikan — otomatis diisi tanggal hari import'],
    ['Note', 'Free text'],
    ['PIC Dev', 'Frontend / Backend'],
    ['Capture', 'Kosongkan — upload manual terpisah setelah data masuk'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 16 }, { wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsData, 'Test Case Template');
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}