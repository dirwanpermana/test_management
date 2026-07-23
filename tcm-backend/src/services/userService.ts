import { pool } from '../db/pool';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role_code: string;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.email, r.code AS role_code
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1 AND u.is_active = TRUE`,
    [username],
  );
  return rows[0] ?? null;
}

export async function listUsersByRole(role?: string) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.full_name AS "fullName", u.email, r.code AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE ($1::text IS NULL OR r.code = $1)
     ORDER BY u.full_name`,
    [role ?? null],
  );
  return rows;
}
