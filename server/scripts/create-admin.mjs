import 'dotenv/config';
import { loadConfig } from '../config.mjs';
import { createPool } from '../db/pool.mjs';
import { hashPassword } from '../auth/passwords.mjs';

const config = loadConfig();
const username = process.env.ADMIN_INITIAL_USERNAME || 'admin';
const password = process.env.ADMIN_INITIAL_PASSWORD || '';

if (!config.databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

if (password.length < 12) {
  console.error('ADMIN_INITIAL_PASSWORD must be at least 12 characters');
  process.exit(1);
}

const pool = createPool({ config });
const client = await pool.connect();

try {
  await client.query('begin');
  const user = await client.query(
    `
      insert into app.users(account_type, display_name)
      values ('admin', $1)
      on conflict do nothing
      returning id
    `,
    [username],
  );
  let userId = user.rows[0]?.id;
  if (!userId) {
    const existing = await client.query('select user_id from app.admin_accounts where username = $1', [username]);
    userId = existing.rows[0]?.user_id;
  }
  if (!userId) {
    const created = await client.query("insert into app.users(account_type, display_name) values ('admin', $1) returning id", [username]);
    userId = created.rows[0].id;
  }
  await client.query(
    `
      insert into app.admin_accounts(user_id, username, password_hash, role)
      values ($1, $2, $3, 'admin')
      on conflict (username)
      do update set password_hash = excluded.password_hash, updated_at = now()
    `,
    [userId, username, await hashPassword(password)],
  );
  await client.query('commit');
  console.log(`admin account ready: ${username}`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
