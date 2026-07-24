/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const PORT = 55433;
process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`;
process.env.JWT_SECRET = 'smoke-test-secret';
process.env.CORS_ORIGIN = 'http://localhost:5173';

let failures = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS - ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL - ${label}`, extra ?? '');
  }
}

async function main() {
  console.log('Booting PGlite (in-memory Postgres-compatible engine)...');
  const db = new PGlite({ extensions: { pgcrypto } });
  const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 10 });
  await server.start();
  console.log(`PGlite socket server listening on ${PORT}`);

  const { pool } = await import('../db/pool.js');

  console.log('Applying schema.sql...');
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(schemaSql);

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const roleRes = await pool.query('SELECT id, code FROM roles');
  const roleIdByCode = Object.fromEntries(roleRes.rows.map((r: any) => [r.code, r.id]));
  const seedUsers = [
    { username: 'qa1', fullName: 'Siti (QA)', email: 'qa1@kopnus.com', role: 'QA' },
    { username: 'dev1', fullName: 'Budi (Dev FE)', email: 'dev1@kopnus.com', role: 'DEV' },
  ];
  for (const u of seedUsers) {
    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES ($1,$2,$3,$4,$5)`,
      [u.username, passwordHash, u.fullName, u.email, roleIdByCode[u.role]],
    );
  }

  const { createApp } = await import('../app.js');
  const app = createApp();

  console.log('\n--- Running smoke tests ---');

  const loginQa = await request(app).post('/api/auth/login').send({ username: 'qa1', password: 'password123' });
  check('QA login returns 200 + token', loginQa.status === 200 && !!loginQa.body.token, loginQa.body);
  const qaToken = loginQa.body.token;

  const loginBad = await request(app).post('/api/auth/login').send({ username: 'qa1', password: 'wrong' });
  check('Login with wrong password returns 401', loginBad.status === 401);

  const loginDev = await request(app).post('/api/auth/login').send({ username: 'dev1', password: 'password123' });
  const devToken = loginDev.body.token;
  check('DEV login returns 200 + token', loginDev.status === 200 && !!devToken);

  const headerRes = await request(app)
    .post('/api/test-case-headers')
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ namaTestCase: 'Login Module', jiraUrl: '', namaMenu: 'Login' });
  check('Create header as QA returns 201', headerRes.status === 201, headerRes.body);
  check('Header code matches YYMMDD pattern', /^\d{6}$/.test(headerRes.body.headerCode));
  const headerId = headerRes.body.id;

  const headerForbidden = await request(app)
    .post('/api/test-case-headers')
    .set('Authorization', `Bearer ${devToken}`)
    .send({ namaTestCase: 'x', jiraUrl: '', namaMenu: 'y' });
  check('Create header as DEV returns 403', headerForbidden.status === 403);

  const item1 = await request(app)
    .post(`/api/test-case-headers/${headerId}/items`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ featureName: 'Login', testType: 'Positive', scenario: 'valid login', steps: '...', expectedResult: 'ok' });
  const item2 = await request(app)
    .post(`/api/test-case-headers/${headerId}/items`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ featureName: 'Login', testType: 'Negative', scenario: 'invalid login', steps: '...', expectedResult: 'error msg' });

  check('Item 1 created (201)', item1.status === 201, item1.body);
  check('Item 2 created (201)', item2.status === 201, item2.body);
  check(
    'case_no format is YYMMDD-NN and sequential',
    /^\d{6}-01$/.test(item1.body.caseNo) && /^\d{6}-02$/.test(item2.body.caseNo),
    { case1: item1.body.caseNo, case2: item2.body.caseNo },
  );

  const editForbidden = await request(app)
    .put(`/api/test-case-items/${item1.body.id}`)
    .set('Authorization', `Bearer ${devToken}`)
    .send({ status: 'Pass' });
  check('DEV editing test case item returns 403', editForbidden.status === 403);

  const editOk = await request(app)
    .put(`/api/test-case-items/${item2.body.id}`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ status: 'Fail' });
  check('QA updates item status to Fail (200)', editOk.status === 200 && editOk.body.status === 'Fail');

  const bugRes = await request(app)
    .post('/api/bugs')
    .set('Authorization', `Bearer ${qaToken}`)
    .send({
      testCaseNo: item2.body.caseNo,
      scenario: 'Login gagal dengan password salah tapi tidak muncul pesan error',
      stepsToReproduce: '1. buka login\n2. isi password salah\n3. submit',
      expectedResult: 'muncul pesan error',
      actualResult: 'tidak ada pesan apapun',
      assignedTo: loginDev.body.user.id,
    });
  check('Create bug as QA returns 201', bugRes.status === 201, bugRes.body);
  check('bug_no format is BUG-YYMMDD-01', /^BUG-\d{6}-01$/.test(bugRes.body.bugNo), bugRes.body.bugNo);
  check('Default severity is Medium', bugRes.body.severity === 'Medium', bugRes.body.severity);
  check('Default priority is Medium', bugRes.body.priority === 'Medium', bugRes.body.priority);
  const bugId = bugRes.body.id;

  const devInvalidStatus = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${devToken}`)
    .send({ status: 'Close' });
  check('DEV changing to Close returns 403 (DEV hanya boleh Ready to Test / On Progress Dev)', devInvalidStatus.status === 403);

  const devStartOk = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${devToken}`)
    .send({ status: 'On Progress Dev' });
  check('DEV changing to On Progress Dev returns 200', devStartOk.status === 200, devStartOk.body);

  const qaJumpToHold = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ status: 'Hold' });
  check('QA changing to Hold returns 200 (QA boleh status manapun)', qaJumpToHold.status === 200, qaJumpToHold.body);

  const qaRetestOk = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ status: 'On Progress QA' });
  check('QA changing to On Progress QA returns 200', qaRetestOk.status === 200, qaRetestOk.body);

  const devReopenForbidden = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${devToken}`)
    .send({ status: 'Reopen' });
  check('DEV changing to Reopen returns 403 (di luar 2 status yang diizinkan untuk DEV)', devReopenForbidden.status === 403);

  const qaCloseOk = await request(app)
    .patch(`/api/bugs/${bugId}/status`)
    .set('Authorization', `Bearer ${qaToken}`)
    .send({ status: 'Close' });
  check('QA closing bug returns 200', qaCloseOk.status === 200 && qaCloseOk.body.status === 'Close');

  const attachmentRes = await request(app)
    .post(`/api/bugs/${bugId}/attachments`)
    .set('Authorization', `Bearer ${qaToken}`)
    .attach('file', Buffer.from('dummy screenshot content'), 'screenshot.png');
  check('Upload attachment returns 201 with fileName', attachmentRes.status === 201 && attachmentRes.body.fileName === 'screenshot.png', attachmentRes.body);

  const commentRes = await request(app)
    .post(`/api/bugs/${bugId}/comments`)
    .set('Authorization', `Bearer ${devToken}`)
    .send({ comment: 'Sudah diperbaiki di PR #123' });
  check('DEV can comment on bug (201)', commentRes.status === 201, commentRes.body);

  const bugDetail = await request(app)
    .get(`/api/bugs/${bugId}`)
    .set('Authorization', `Bearer ${qaToken}`);
  check(
    'Bug status history has 5 entries (Open, On Progress Dev, Hold, On Progress QA, Close)',
    bugDetail.body.history?.length === 5,
    bugDetail.body.history,
  );
  check('Bug detail includes the comment', bugDetail.body.comments?.length === 1);
  check('Bug detail includes the uploaded attachment', bugDetail.body.bug?.attachments?.length === 1, bugDetail.body.bug?.attachments);

  const monitoringTc = await request(app)
    .get('/api/monitoring/test-cases')
    .set('Authorization', `Bearer ${qaToken}`);
  const row = monitoringTc.body.find((r: any) => r.headerId === headerId);
  check('Monitoring test-case row found', !!row, monitoringTc.body);
  check('Monitoring totalCase = 2, executedCase = 1', row?.totalCase === 2 && row?.executedCase === 1, row);
  check('Monitoring category = On Progress', row?.category === 'On Progress', row);

  const monitoringBug = await request(app)
    .get('/api/monitoring/bugs')
    .set('Authorization', `Bearer ${qaToken}`);
  const bugRow = monitoringBug.body.find((r: any) => r.status === 'Close');
  check('Monitoring bug row for Close status found', !!bugRow, monitoringBug.body);

  const noAuth = await request(app).get('/api/bugs');
  check('Request without token returns 401', noAuth.status === 401);

  const deleteHeaderForbidden = await request(app)
    .delete(`/api/test-case-headers/${headerId}`)
    .set('Authorization', `Bearer ${devToken}`);
  check('DEV deleting test case header returns 403', deleteHeaderForbidden.status === 403);

  const deleteHeaderOk = await request(app)
    .delete(`/api/test-case-headers/${headerId}`)
    .set('Authorization', `Bearer ${qaToken}`);
  check('QA deleting test case header returns 204', deleteHeaderOk.status === 204);

  const itemsAfterDelete = await request(app)
    .get('/api/test-case-items')
    .query({ headerId })
    .set('Authorization', `Bearer ${qaToken}`);
  check('Items under deleted header are cascade-deleted', itemsAfterDelete.body.length === 0, itemsAfterDelete.body);

  console.log(`\n--- Result: ${failures === 0 ? 'ALL PASSED' : `${failures} FAILURE(S)`} ---`);

  await pool.end();
  await server.stop();
  await db.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
