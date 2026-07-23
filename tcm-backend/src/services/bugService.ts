import { pool } from '../db/pool';

const BUG_SELECT = `
  SELECT
    b.id, b.bug_no AS "bugNo", b.test_case_item_id AS "testCaseItemId",
    tci.case_no AS "testCaseNo",
    b.reporter_id AS "reporterId", reporter.full_name AS "reporterName",
    b.scenario, b.steps_to_reproduce AS "stepsToReproduce",
    b.expected_result AS "expectedResult", b.actual_result AS "actualResult",
    b.status, b.assigned_to AS "assignedTo", assignee.full_name AS "assignedToName",
    b.created_at AS "createdAt", b.updated_at AS "updatedAt"
  FROM bugs b
  LEFT JOIN test_case_items tci ON tci.id = b.test_case_item_id
  LEFT JOIN users reporter ON reporter.id = b.reporter_id
  LEFT JOIN users assignee ON assignee.id = b.assigned_to
`;

export async function listBugs() {
  const { rows } = await pool.query(`${BUG_SELECT} ORDER BY b.created_at DESC`);
  return rows;
}

export async function getBugById(id: string) {
  const { rows } = await pool.query(`${BUG_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getComments(bugId: string) {
  const { rows } = await pool.query(
    `SELECT c.id, c.bug_id AS "bugId", c.user_id AS "userId", u.full_name AS "userName",
            c.comment, c.created_at AS "createdAt"
     FROM bug_comments c JOIN users u ON u.id = c.user_id
     WHERE c.bug_id = $1 ORDER BY c.created_at`,
    [bugId],
  );
  return rows;
}

export async function getHistory(bugId: string) {
  const { rows } = await pool.query(
    `SELECT id, bug_id AS "bugId", from_status AS "fromStatus", to_status AS "toStatus",
            changed_by AS "changedBy", changed_at AS "changedAt"
     FROM bug_status_history WHERE bug_id = $1 ORDER BY changed_at`,
    [bugId],
  );
  return rows;
}

export async function createBug(input: {
  testCaseNo?: string; reporterId: string; scenario: string; stepsToReproduce: string;
  expectedResult: string; actualResult: string; assignedTo?: string;
}) {
  let testCaseItemId: string | null = null;
  if (input.testCaseNo) {
    const { rows } = await pool.query('SELECT id FROM test_case_items WHERE case_no = $1', [input.testCaseNo]);
    testCaseItemId = rows[0]?.id ?? null;
  }

  const { rows } = await pool.query(
    `INSERT INTO bugs (test_case_item_id, reporter_id, scenario, steps_to_reproduce,
                        expected_result, actual_result, assigned_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      testCaseItemId, input.reporterId, input.scenario, input.stepsToReproduce,
      input.expectedResult, input.actualResult, input.assignedTo ?? null,
    ],
  );
  return getBugById(rows[0].id);
}

export async function isTransitionAllowed(fromStatus: string, toStatus: string, role: string) {
  const { rows } = await pool.query(
    'SELECT 1 FROM bug_status_transitions WHERE from_status = $1 AND to_status = $2 AND allowed_role = $3',
    [fromStatus, toStatus, role],
  );
  return rows.length > 0;
}

export async function changeStatus(id: string, toStatus: string, changedBy: string) {
  await pool.query('UPDATE bugs SET status = $1, updated_by = $2 WHERE id = $3', [toStatus, changedBy, id]);
  return getBugById(id);
}

export async function addComment(bugId: string, userId: string, comment: string) {
  const { rows } = await pool.query(
    `INSERT INTO bug_comments (bug_id, user_id, comment)
     VALUES ($1,$2,$3)
     RETURNING id, bug_id AS "bugId", user_id AS "userId", comment, created_at AS "createdAt"`,
    [bugId, userId, comment],
  );
  const { rows: userRow } = await pool.query('SELECT full_name AS "fullName" FROM users WHERE id = $1', [userId]);
  return { ...rows[0], userName: userRow[0]?.fullName };
}
