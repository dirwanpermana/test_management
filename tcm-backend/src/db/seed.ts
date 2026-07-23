import bcrypt from 'bcryptjs';
import { pool } from './pool';

const MOCK_PASSWORD = 'password123';

async function seed() {
  const passwordHash = await bcrypt.hash(MOCK_PASSWORD, 10);

  const roleRes = await pool.query<{ id: number; code: string }>('SELECT id, code FROM roles');
  const roleIdByCode = Object.fromEntries(roleRes.rows.map((r: { id: number; code: string }) => [r.code, r.id]));

  const users = [
    { username: 'qa1', fullName: 'Siti (QA)', email: 'qa1@kopnus.com', role: 'QA' },
    { username: 'qa2', fullName: 'Andi (QA)', email: 'qa2@kopnus.com', role: 'QA' },
    { username: 'dev1', fullName: 'Budi (Dev FE)', email: 'dev1@kopnus.com', role: 'DEV' },
    { username: 'dev2', fullName: 'Rani (Dev BE)', email: 'dev2@kopnus.com', role: 'DEV' },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, role_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, passwordHash, u.fullName, u.email, roleIdByCode[u.role]],
    );
  }

  console.log(`Seed complete. Semua user password: ${MOCK_PASSWORD}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
