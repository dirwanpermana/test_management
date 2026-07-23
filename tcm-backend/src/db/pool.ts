import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err: Error) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle PostgreSQL client', err);
});
