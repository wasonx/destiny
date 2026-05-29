import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './pool.mjs';
import { loadConfig } from '../config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

export async function runMigrations({ pool }) {
  await pool.query('create schema if not exists app');
  await pool.query(`
    create table if not exists app.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const filename of files) {
    const existing = await pool.query('select 1 from app.schema_migrations where filename = $1', [filename]);
    if (existing.rowCount) {
      console.log(`skip ${filename}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into app.schema_migrations(filename) values ($1)', [filename]);
      await client.query('commit');
      console.log(`applied ${filename}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const config = loadConfig();
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = createPool({ config });
  try {
    await runMigrations({ pool });
  } finally {
    await pool.end();
  }
}
