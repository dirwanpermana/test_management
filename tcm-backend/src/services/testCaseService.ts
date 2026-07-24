// import { pool } from '../db/pool';

// const HEADER_SELECT = `
//   SELECT
//     h.id, h.header_code AS "headerCode", h.nama_test_case AS "namaTestCase",
//     h.sprint, h.jira_url AS "jiraUrl", h.nama_menu AS "namaMenu",
//     h.created_by AS "createdBy", u.full_name AS "createdByName",
//     h.created_at AS "createdAt", h.updated_at AS "updatedAt"
//   FROM test_case_headers h
//   LEFT JOIN users u ON u.id = h.created_by
// `;

// export async function listHeaders() {
//   const { rows } = await pool.query(`${HEADER_SELECT} ORDER BY h.created_at DESC`);
//   return rows;
// }

// export async function createHeader(input: {
//   namaTestCase: string; sprint?: string; jiraUrl?: string; namaMenu: string; createdBy: string;
// }) {
//   const { rows } = await pool.query(
//     `INSERT INTO test_case_headers (nama_test_case, sprint, jira_url, nama_menu, created_by)
//      VALUES ($1, $2, $3, $4, $5)
//      RETURNING id`,
//     [input.namaTestCase, input.sprint ?? null, input.jiraUrl ?? null, input.namaMenu, input.createdBy],
//   );
//   const { rows: full } = await pool.query(`${HEADER_SELECT} WHERE h.id = $1`, [rows[0].id]);
//   return full[0];
// }

// export async function deleteHeader(id: string): Promise<boolean> {
//   // ON DELETE CASCADE di FK test_case_items.header_id akan menghapus semua item di bawahnya juga.
//   const result = await pool.query('DELETE FROM test_case_headers WHERE id = $1', [id]);
//   return (result.rowCount ?? 0) > 0;
// }

// const ITEM_SELECT = `
//   SELECT
//     i.id, i.header_id AS "headerId", i.case_no AS "caseNo", i.seq_no AS "seqNo",
//     i.feature_name AS "featureName", i.test_type AS "testType", i.scenario, i.steps,
//     i.test_data AS "testData", i.expected_result AS "expectedResult", i.status,
//     i.pic_qa AS "picQa", qa.full_name AS "picQaName",
//     i.test_date::text AS "testDate", i.note,
//     i.pic_dev AS "picDev", dev.full_name AS "picDevName", i.dev_area AS "devArea",
//     i.created_at AS "createdAt", i.updated_at AS "updatedAt"
//   FROM test_case_items i
//   LEFT JOIN users qa ON qa.id = i.pic_qa
//   LEFT JOIN users dev ON dev.id = i.pic_dev
// `;

// export async function listItems(headerId?: string) {
//   const { rows } = await pool.query(
//     `${ITEM_SELECT} ${headerId ? 'WHERE i.header_id = $1' : ''} ORDER BY i.seq_no`,
//     headerId ? [headerId] : [],
//   );
//   return rows;
// }

// export async function createItem(headerId: string, input: {
//   featureName: string; testType: string; scenario: string; steps: string;
//   testData?: string; expectedResult: string; status?: string; picQa: string;
//   testDate?: string; note?: string; picDev?: string; devArea?: string;
// }) {
//   const { rows } = await pool.query(
//     `INSERT INTO test_case_items
//        (header_id, feature_name, test_type, scenario, steps, test_data, expected_result,
//         status, pic_qa, test_date, note, pic_dev, dev_area)
//      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Not Executed'),$9,$10,$11,$12,$13)
//      RETURNING id`,
//     [
//       headerId, input.featureName, input.testType, input.scenario, input.steps,
//       input.testData ?? null, input.expectedResult, input.status ?? null, input.picQa,
//       input.testDate ?? null, input.note ?? null, input.picDev ?? null, input.devArea ?? null,
//     ],
//   );
//   const { rows: full } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [rows[0].id]);
//   return full[0];
// }

// export async function updateItem(id: string, input: Partial<{
//   featureName: string; testType: string; scenario: string; steps: string;
//   testData: string; expectedResult: string; status: string; picQa: string;
//   testDate: string; note: string; picDev: string; devArea: string;
// }>) {
//   const fieldMap: Record<string, string> = {
//     featureName: 'feature_name', testType: 'test_type', scenario: 'scenario', steps: 'steps',
//     testData: 'test_data', expectedResult: 'expected_result', status: 'status', picQa: 'pic_qa',
//     testDate: 'test_date', note: 'note', picDev: 'pic_dev', devArea: 'dev_area',
//   };
//   const sets: string[] = [];
//   const values: unknown[] = [];
//   let idx = 1;
//   for (const [key, column] of Object.entries(fieldMap)) {
//     if (key in input) {
//       sets.push(`${column} = $${idx}`);
//       values.push((input as Record<string, unknown>)[key]);
//       idx += 1;
//     }
//   }
//   if (sets.length === 0) {
//     const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
//     return rows[0] ?? null;
//   }
//   values.push(id);
//   await pool.query(`UPDATE test_case_items SET ${sets.join(', ')} WHERE id = $${idx}`, values);
//   const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [id]);
//   return rows[0] ?? null;
// }

// export async function deleteItem(id: string): Promise<boolean> {
//   const result = await pool.query('DELETE FROM test_case_items WHERE id = $1', [id]);
//   return (result.rowCount ?? 0) > 0;
// }

// export async function findHeaderById(id: string) {
//   const { rows } = await pool.query('SELECT id FROM test_case_headers WHERE id = $1', [id]);
//   return rows[0] ?? null;
// }


import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../db/pool';
import { UPLOAD_DIR } from '../middleware/upload';

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

export async function deleteHeader(id: string): Promise<boolean> {
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
  testData?: string; expectedResult: string; status?: string; picQa: string;
  testDate?: string; note?: string; devArea?: string;
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
  testData: string; expectedResult: string; status: string; picQa: string;
  testDate: string; note: string; devArea: string;
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

  // best-effort hapus file fisik lama dari disk, tidak blocking response
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