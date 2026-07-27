// import fs from 'node:fs';
// import path from 'node:path';
// import { pool } from './pool';

// async function migrate() {
//   const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
//   const sql = fs.readFileSync(schemaPath, 'utf8');
//   console.log('Running schema.sql against', process.env.DATABASE_URL);
//   await pool.query(sql);
//   console.log('Migration complete.');
//   await pool.end();
// }

// migrate().catch((err) => {
//   console.error('Migration failed:', err);
//   process.exit(1);
// });


import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

const DB_DIR = path.resolve(__dirname, '../../db');

/**
 * Migration runner dengan tracking table.
 *
 * Kenapa ini dibuat (lihat riwayat insiden): sebelumnya migrate.ts HANYA
 * menjalankan schema.sql. File migration_002 s/d migration_010 harus
 * dijalankan manual satu-satu, dan tidak ada cara tahu mana yang sudah/
 * belum jalan — root cause dari beberapa insiden "value too long for
 * type ..." yang muncul berulang tiap environment (local, lalu nanti
 * production) di-setup ulang.
 *
 * Sekarang:
 *   1. schema.sql SELALU dijalankan (aman, idempotent — semua CREATE
 *      TABLE pakai IF NOT EXISTS).
 *   2. Setiap file `migration_*.sql` di folder db/ dicek ke tabel
 *      schema_migrations; yang belum tercatat akan dijalankan BERURUTAN
 *      (urut nama file / nomor), masing-masing dibungkus transaksi
 *      sendiri, lalu dicatat kalau sukses.
 *   3. Kalau satu file gagal di tengah jalan, transaksi file itu saja
 *      yang di-rollback (bukan ikut membatalkan file-file sebelumnya
 *      yang sudah sukses & tercatat) — dan proses BERHENTI (tidak lanjut
 *      ke file berikutnya), supaya tidak terulang kejadian seperti
 *      migration_005 yang gagal di tengah tapi tetap lanjut ke statement
 *      berikutnya.
 */
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    VARCHAR(255) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

function listMigrationFiles(): string[] {
  return fs
    .readdirSync(DB_DIR)
    .filter((f) => f.startsWith('migration_') && f.endsWith('.sql'))
    .sort(); // aman karena semua file diberi prefix angka (migration_002_..., migration_010_...)
}

async function runMigrationFile(filename: string) {
  const filePath = path.join(DB_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✅ Applied: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed: ${filename}`);
    throw err;
  } finally {
    client.release();
  }
}

async function migrate() {
  console.log('Running schema.sql against', process.env.DATABASE_URL);
  const schemaPath = path.join(DB_DIR, 'schema.sql');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));
  console.log('✅ schema.sql applied (baseline).');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const allMigrationFiles = listMigrationFiles();
  const pending = allMigrationFiles.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('No pending migrations. Database is up to date.');
  } else {
    console.log(`Found ${pending.length} pending migration(s): ${pending.join(', ')}`);
    for (const filename of pending) {
      // eslint-disable-next-line no-await-in-loop
      await runMigrationFile(filename);
    }
  }

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});