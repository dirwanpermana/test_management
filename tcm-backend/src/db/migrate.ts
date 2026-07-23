import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

async function migrate() {
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Running schema.sql against', process.env.DATABASE_URL);
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
