import { pool } from '../db/pool';

export async function listHeaders() {
  const { rows } = await pool.query(
    `SELECT id, header_code AS "headerCode", nama_test_case AS "namaTestCase",
            jira_url AS "jiraUrl", nama_menu AS "namaMenu",
            created_by AS "createdBy", created_at AS "createdAt"
     FROM test_case_headers ORDER BY created_at DESC`,
  );
  return rows;
}

export async function createHeader(input: {
  namaTestCase: string; jiraUrl?: string; namaMenu: string; createdBy: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO test_case_headers (nama_test_case, jira_url, nama_menu, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, header_code AS "headerCode", nama_test_case AS "namaTestCase",
               jira_url AS "jiraUrl", nama_menu AS "namaMenu",
               created_by AS "createdBy", created_at AS "createdAt"`,
    [input.namaTestCase, input.jiraUrl ?? null, input.namaMenu, input.createdBy],
  );
  return rows[0];
}

const ITEM_SELECT = `
  SELECT
    i.id, i.header_id AS "headerId", i.case_no AS "caseNo", i.seq_no AS "seqNo",
    i.feature_name AS "featureName", i.test_type AS "testType", i.scenario, i.steps,
    i.test_data AS "testData", i.expected_result AS "expectedResult", i.status,
    i.pic_qa AS "picQa", qa.full_name AS "picQaName",
    i.test_date AS "testDate", i.note,
    i.pic_dev AS "picDev", dev.full_name AS "picDevName", i.dev_area AS "devArea",
    i.created_at AS "createdAt", i.updated_at AS "updatedAt"
  FROM test_case_items i
  LEFT JOIN users qa ON qa.id = i.pic_qa
  LEFT JOIN users dev ON dev.id = i.pic_dev
`;

export async function listItems(headerId?: string) {
  const { rows } = await pool.query(
    `${ITEM_SELECT} ${headerId ? 'WHERE i.header_id = $1' : ''} ORDER BY i.seq_no`,
    headerId ? [headerId] : [],
  );
  return rows;
}

export async function createItem(headerId: string, input: {
  featureName: string; testType: string; scenario: string; steps: string;
  testData?: string; expectedResult: string; status?: string; picQa: string;
  testDate?: string; note?: string; picDev?: string; devArea?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO test_case_items
       (header_id, feature_name, test_type, scenario, steps, test_data, expected_result,
        status, pic_qa, test_date, note, pic_dev, dev_area)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Not Executed'),$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      headerId, input.featureName, input.testType, input.scenario, input.steps,
      input.testData ?? null, input.expectedResult, input.status ?? null, input.picQa,
      input.testDate ?? null, input.note ?? null, input.picDev ?? null, input.devArea ?? null,
    ],
  );
  const { rows: full } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [rows[0].id]);
  return full[0];
}

export async function updateItem(id: string, input: Partial<{
  featureName: string; testType: string; scenario: string; steps: string;
  testData: string; expectedResult: string; status: string; picQa: string;
  testDate: string; note: string; picDev: string; devArea: string;
}>) {
  const fieldMap: Record<string, string> = {
    featureName: 'feature_name', testType: 'test_type', scenario: 'scenario', steps: 'steps',
    testData: 'test_data', expectedResult: 'expected_result', status: 'status', picQa: 'pic_qa',
    testDate: 'test_date', note: 'note', picDev: 'pic_dev', devArea: 'dev_area',
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
