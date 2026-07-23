import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { pool } from '../db/pool';

export const monitoringRouter = Router();
monitoringRouter.use(authenticate);

monitoringRouter.get('/monitoring/test-cases', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT header_id AS "headerId", header_code AS "headerCode", nama_test_case AS "namaTestCase",
            total_case AS "totalCase", executed_case AS "executedCase", percentage,
            category, pic_qa_names AS "picQaNames"
     FROM v_test_case_monitoring ORDER BY header_code DESC`,
  );
  res.json(rows);
}));

monitoringRouter.get('/monitoring/bugs', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT status, assigned_to_name AS "assignedToName", total_bug AS "totalBug"
     FROM v_bug_monitoring ORDER BY status`,
  );
  res.json(rows);
}));
