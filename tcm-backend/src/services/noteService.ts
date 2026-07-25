import { pool } from '../db/pool';

const NOTE_SELECT = `
  SELECT
    n.id, n.title, n.content,
    n.created_by AS "createdBy", creator.full_name AS "createdByName",
    n.updated_by AS "updatedBy", updater.full_name AS "updatedByName",
    n.created_at AS "createdAt", n.updated_at AS "updatedAt"
  FROM notes n
  LEFT JOIN users creator ON creator.id = n.created_by
  LEFT JOIN users updater ON updater.id = n.updated_by
`;

export async function listNotes() {
  const { rows } = await pool.query(`${NOTE_SELECT} ORDER BY n.updated_at DESC`);
  return rows;
}

export async function getNoteById(id: string) {
  const { rows } = await pool.query(`${NOTE_SELECT} WHERE n.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNote(createdBy: string) {
  const { rows } = await pool.query(
    `INSERT INTO notes (title, content, created_by, updated_by)
     VALUES ('Untitled', '', $1, $1) RETURNING id`,
    [createdBy],
  );
  return getNoteById(rows[0].id);
}

export async function updateNote(
  id: string,
  input: Partial<{ title: string; content: string }>,
  updatedBy: string,
) {
  const fieldMap: Record<string, string> = { title: 'title', content: 'content' };
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
  if (sets.length === 0) return getNoteById(id);
  sets.push(`updated_by = $${idx}`);
  values.push(updatedBy);
  idx += 1;
  sets.push('updated_at = now()');
  values.push(id);
  await pool.query(`UPDATE notes SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  return getNoteById(id);
}

export async function deleteNote(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}