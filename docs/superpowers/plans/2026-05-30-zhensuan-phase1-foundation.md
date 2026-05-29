# Zhensuan Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable foundation for the 甄算后台: database schema, API structure, backend/admin authentication, customer multi-login mocks, and an internal React admin shell.

**Architecture:** Keep the current Vite/React H5 and Node/Express API, but split the backend into small modules so auth, database access, reports, and routes do not live in one file. Phase 1 uses PostgreSQL as the system of record and implements mockable WeChat/SMS/QR login flows before connecting real external providers.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, native `node:test`, Vite, React, TypeScript, existing Python unittest smoke tests.

---

## Scope

This plan covers Phase 1 from the design spec:

- Backend app structure.
- PostgreSQL migration runner and Phase 1 auth schema.
- Backend editor/platform admin username-password login.
- Customer login by WeChat code mock, phone verification code mock, and QR scan mock.
- Internal admin shell at `/admin`.
- Tests and deployment notes for the foundation.

This plan does not cover Neo4j, MedusaJS, real WeChat API calls, real SMS provider calls, real WeChat Pay, rule engine, or knowledge graph editing. Those become separate implementation plans after this foundation is running.

## File Structure

Create or modify these files:

- Modify: `package.json` for dependencies and test scripts.
- Modify: `.env.example` for database and auth environment variables.
- Modify: `server/index.mjs` to become a thin process entrypoint.
- Create: `server/app.mjs` for Express app construction and route mounting.
- Create: `server/config.mjs` for environment parsing.
- Create: `server/db/pool.mjs` for PostgreSQL connection pooling.
- Create: `server/db/migrate.mjs` for local/server migration execution.
- Create: `server/db/migrations/001_phase1_auth.sql` for users, identities, sessions, OTP, QR login, audit logs.
- Create: `server/auth/passwords.mjs` for password hashing and verification with Node crypto.
- Create: `server/auth/sessions.mjs` for session token creation, hashing, and lookup.
- Create: `server/middleware/require-session.mjs` for protected API routes.
- Create: `server/routes/report-routes.mjs` by moving the existing report generation endpoint out of `server/index.mjs`.
- Create: `server/routes/admin-auth-routes.mjs` for backend editor/platform admin login.
- Create: `server/routes/customer-auth-routes.mjs` for WeChat mock, OTP mock, and QR login mock.
- Create: `server/scripts/create-admin.mjs` for first platform admin account creation.
- Create: `server/tests/passwords.test.mjs` for password hashing tests.
- Create: `server/tests/customer-auth.test.mjs` for OTP and QR flow tests.
- Create: `server/tests/app-routes.test.mjs` for route smoke tests.
- Modify: `src/main.tsx` to render admin shell when the path starts with `/admin`.
- Create: `src/admin/AdminApp.tsx` for the internal backend shell.
- Create: `src/admin/api.ts` for admin API requests.
- Create: `src/admin/components/AdminLayout.tsx` for sidebar and page frame.
- Create: `src/admin/pages/LoginPage.tsx` for backend login.
- Create: `src/admin/pages/DashboardPage.tsx` for the Phase 1 overview.
- Create: `src/admin/pages/UsersPage.tsx` for customer/account placeholder management view.
- Create: `tests/test_phase1_admin_scaffold.py` for static smoke checks.

---

### Task 1: Add Dependencies And Scripts

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Add server dependencies and scripts**

Modify `package.json` so the dependency and script sections include:

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server/index.mjs",
    "db:migrate": "node server/db/migrate.mjs",
    "admin:create": "node server/scripts/create-admin.mjs",
    "test:server": "node --test server/tests/*.test.mjs",
    "test:py": "python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase1_admin_scaffold",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "pg": "^8.13.1"
  }
}
```

Keep existing dependencies and scripts that are not replaced above.

- [ ] **Step 2: Add environment variables**

Append these lines to `.env.example`:

```env
DATABASE_URL="postgres://zhensuan_app:CHANGE_ME@127.0.0.1:5432/zhensuan"
SESSION_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_STRING"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="CHANGE_ME_BEFORE_USE"
CUSTOMER_AUTH_MOCKS_ENABLED="true"
SMS_CODE_TTL_SECONDS="300"
QR_LOGIN_TTL_SECONDS="180"
```

- [ ] **Step 3: Install dependency**

Run:

```powershell
npm install
```

Expected: `package-lock.json` updates and the command exits with code 0.

- [ ] **Step 4: Verify package scripts are valid**

Run:

```powershell
npm run lint
```

Expected: TypeScript exits with code 0, or reports only errors caused by files created in later tasks not existing yet. If files do not exist yet, continue and re-run lint in Task 8.

---

### Task 2: Split Express App Without Changing Report Behavior

**Files:**
- Modify: `server/index.mjs`
- Create: `server/app.mjs`
- Create: `server/config.mjs`
- Create: `server/routes/report-routes.mjs`
- Test: `server/tests/app-routes.test.mjs`

- [ ] **Step 1: Write a route smoke test**

Create `server/tests/app-routes.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../app.mjs';

test('health route returns api status', async () => {
  const app = createApp({
    config: {
      model: 'deepseek-chat',
      apiKey: '',
      endpoint: 'https://example.invalid/chat',
      customerAuthMocksEnabled: true,
    },
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.model, 'deepseek-chat');
    assert.equal(body.hasKey, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
npm run test:server
```

Expected: FAIL because `server/app.mjs` does not exist.

- [ ] **Step 3: Create config module**

Create `server/config.mjs`:

```js
export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3201),
    apiKey: env.DEEPSEEK_API_KEY || '',
    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
    endpoint: env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
    databaseUrl: env.DATABASE_URL || '',
    sessionSecret: env.SESSION_SECRET || '',
    customerAuthMocksEnabled: env.CUSTOMER_AUTH_MOCKS_ENABLED !== 'false',
    smsCodeTtlSeconds: Number(env.SMS_CODE_TTL_SECONDS || 300),
    qrLoginTtlSeconds: Number(env.QR_LOGIN_TTL_SECONDS || 180),
  };
}
```

- [ ] **Step 4: Move report logic into a route module**

Create `server/routes/report-routes.mjs` by moving the current report helper functions and `/destiny-api/generate` route from `server/index.mjs`. Export this function:

```js
export function mountReportRoutes(app, { config }) {
  app.get('/destiny-api/health', (_req, res) => {
    res.json({ ok: true, model: config.model, hasKey: Boolean(config.apiKey) });
  });

  app.post('/destiny-api/generate', async (req, res) => {
    // Move the existing generate endpoint body here unchanged,
    // replacing apiKey/model/endpoint references with config.apiKey/config.model/config.endpoint.
  });
}
```

When moving code, preserve the existing fallback report JSON shape and safety disclaimer.

- [ ] **Step 5: Create the app factory**

Create `server/app.mjs`:

```js
import express from 'express';
import { loadConfig } from './config.mjs';
import { mountReportRoutes } from './routes/report-routes.mjs';

export function createApp(options = {}) {
  const app = express();
  const config = options.config || loadConfig();

  app.use(express.json({ limit: '1mb' }));
  mountReportRoutes(app, { config });

  return app;
}
```

- [ ] **Step 6: Reduce process entrypoint**

Replace `server/index.mjs` with:

```js
import 'dotenv/config';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, '127.0.0.1', () => {
  console.log(`destiny api listening on http://127.0.0.1:${config.port}`);
});
```

- [ ] **Step 7: Run route tests**

Run:

```powershell
npm run test:server
```

Expected: PASS for the health route test.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json .env.example server/index.mjs server/app.mjs server/config.mjs server/routes/report-routes.mjs server/tests/app-routes.test.mjs
git commit -m "refactor: split express app"
```

---

### Task 3: Add PostgreSQL Migration Foundation

**Files:**
- Create: `server/db/pool.mjs`
- Create: `server/db/migrate.mjs`
- Create: `server/db/migrations/001_phase1_auth.sql`
- Test: `server/tests/app-routes.test.mjs`

- [ ] **Step 1: Create connection pool module**

Create `server/db/pool.mjs`:

```js
import pg from 'pg';
import { loadConfig } from '../config.mjs';

const { Pool } = pg;

export function createPool(config = loadConfig()) {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for database access');
  }

  return new Pool({
    connectionString: config.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}
```

- [ ] **Step 2: Create migration SQL**

Create `server/db/migrations/001_phase1_auth.sql`:

```sql
create schema if not exists app;
create extension if not exists pgcrypto;

create table if not exists app.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists app.users (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('customer', 'editor', 'admin')),
  display_name text not null default '',
  phone text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_phone_unique
  on app.users (phone)
  where phone is not null;

create table if not exists app.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('editor', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.customer_identities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id) on delete cascade,
  provider text not null check (provider in ('wechat_mini', 'phone')),
  provider_subject text not null,
  unionid text,
  phone text,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create table if not exists app.login_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  account_type text not null check (account_type in ('customer', 'editor', 'admin')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app.sms_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sms_otp_phone_created_at_idx
  on app.sms_otp_challenges (phone, created_at desc);

create table if not exists app.qr_login_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired', 'cancelled')),
  customer_id uuid references app.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Create migration runner**

Create `server/db/migrate.mjs`:

```js
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPool } from './pool.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationTable(client) {
  await client.query(`
    create schema if not exists app;
    create table if not exists app.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

export async function runMigrations(pool = createPool()) {
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const existing = await client.query('select 1 from app.schema_migrations where version = $1', [version]);
      if (existing.rowCount) continue;

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into app.schema_migrations(version) values ($1)', [version]);
      await client.query('commit');
      console.log(`applied migration ${version}`);
    }
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool();
  runMigrations(pool)
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
```

- [ ] **Step 4: Add SQL smoke test**

Extend `server/tests/app-routes.test.mjs` with:

```js
import fs from 'node:fs/promises';

test('phase 1 migration defines required auth tables', async () => {
  const sql = await fs.readFile(new URL('../db/migrations/001_phase1_auth.sql', import.meta.url), 'utf8');

  for (const table of [
    'app.users',
    'app.admin_accounts',
    'app.customer_identities',
    'app.login_sessions',
    'app.sms_otp_challenges',
    'app.qr_login_sessions',
    'app.audit_logs',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists ${table.replace('.', '\\.')}`));
  }
});
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/db/pool.mjs server/db/migrate.mjs server/db/migrations/001_phase1_auth.sql server/tests/app-routes.test.mjs
git commit -m "feat: add phase one auth schema"
```

---

### Task 4: Add Auth Primitives

**Files:**
- Create: `server/auth/passwords.mjs`
- Create: `server/auth/sessions.mjs`
- Create: `server/middleware/require-session.mjs`
- Test: `server/tests/passwords.test.mjs`

- [ ] **Step 1: Write password tests**

Create `server/tests/passwords.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../auth/passwords.mjs';

test('password hash verifies only the original password', async () => {
  const hash = await hashPassword('CorrectHorseBatteryStaple');

  assert.match(hash, /^scrypt:/);
  assert.equal(await verifyPassword('CorrectHorseBatteryStaple', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```powershell
npm run test:server
```

Expected: FAIL because `server/auth/passwords.mjs` does not exist.

- [ ] **Step 3: Implement password helpers**

Create `server/auth/passwords.mjs`:

```js
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, keyLength);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [scheme, salt, hashHex] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
```

- [ ] **Step 4: Implement session helpers**

Create `server/auth/sessions.mjs`:

```js
import crypto from 'node:crypto';

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token, secret) {
  if (!secret) throw new Error('SESSION_SECRET is required');
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export async function createLoginSession(client, { userId, accountType, token, secret, expiresAt }) {
  const tokenHash = hashSessionToken(token, secret);
  await client.query(
    `insert into app.login_sessions(user_id, account_type, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [userId, accountType, tokenHash, expiresAt],
  );
}
```

- [ ] **Step 5: Implement session middleware**

Create `server/middleware/require-session.mjs`:

```js
import { hashSessionToken } from '../auth/sessions.mjs';

export function requireSession({ pool, config, accountTypes }) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

    if (!token) {
      res.status(401).json({ error: 'Missing session token' });
      return;
    }

    const tokenHash = hashSessionToken(token, config.sessionSecret);
    const result = await pool.query(
      `select s.id as session_id, s.user_id, s.account_type, u.display_name, u.status
       from app.login_sessions s
       join app.users u on u.id = s.user_id
       where s.token_hash = $1
         and s.revoked_at is null
         and s.expires_at > now()`,
      [tokenHash],
    );

    const session = result.rows[0];
    if (!session || session.status !== 'active' || !accountTypes.includes(session.account_type)) {
      res.status(401).json({ error: 'Invalid session token' });
      return;
    }

    req.session = session;
    next();
  };
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add server/auth/passwords.mjs server/auth/sessions.mjs server/middleware/require-session.mjs server/tests/passwords.test.mjs
git commit -m "feat: add auth primitives"
```

---

### Task 5: Add Backend Admin Login

**Files:**
- Create: `server/routes/admin-auth-routes.mjs`
- Create: `server/scripts/create-admin.mjs`
- Modify: `server/app.mjs`
- Test: `server/tests/app-routes.test.mjs`

- [ ] **Step 1: Add admin route smoke test**

Append to `server/tests/app-routes.test.mjs`:

```js
test('admin login route rejects missing credentials', async () => {
  const app = createApp({
    config: {
      model: 'deepseek-chat',
      apiKey: '',
      endpoint: 'https://example.invalid/chat',
      sessionSecret: 'test-secret',
      customerAuthMocksEnabled: true,
    },
    pool: {
      query: async () => ({ rows: [], rowCount: 0 }),
    },
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, 'Username and password are required');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```powershell
npm run test:server
```

Expected: FAIL because admin auth routes are not mounted.

- [ ] **Step 3: Implement admin auth routes**

Create `server/routes/admin-auth-routes.mjs`:

```js
import { createSessionToken, createLoginSession } from '../auth/sessions.mjs';
import { verifyPassword } from '../auth/passwords.mjs';
import { requireSession } from '../middleware/require-session.mjs';

export function mountAdminAuthRoutes(app, { pool, config }) {
  app.post('/destiny-api/admin/login', async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await pool.query(
      `select aa.id, aa.password_hash, aa.role, aa.status, u.id as user_id, u.display_name
       from app.admin_accounts aa
       join app.users u on u.id = aa.user_id
       where aa.username = $1`,
      [username],
    );

    const account = result.rows[0];
    if (!account || account.status !== 'active' || !(await verifyPassword(password, account.password_hash))) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await createLoginSession(pool, {
      userId: account.user_id,
      accountType: account.role,
      token,
      secret: config.sessionSecret,
      expiresAt,
    });

    res.json({
      token,
      user: {
        id: account.user_id,
        username,
        displayName: account.display_name,
        role: account.role,
      },
    });
  });

  app.get(
    '/destiny-api/admin/me',
    requireSession({ pool, config, accountTypes: ['editor', 'admin'] }),
    (req, res) => {
      res.json({ user: req.session });
    },
  );
}
```

- [ ] **Step 4: Mount admin routes**

Modify `server/app.mjs`:

```js
import { createPool } from './db/pool.mjs';
import { mountAdminAuthRoutes } from './routes/admin-auth-routes.mjs';
```

Inside `createApp`:

```js
const pool = options.pool || (config.databaseUrl ? createPool(config) : null);

if (pool) {
  mountAdminAuthRoutes(app, { pool, config });
}
```

Mount these before report routes so health/report behavior stays available without a database.

- [ ] **Step 5: Create first admin script**

Create `server/scripts/create-admin.mjs`:

```js
import 'dotenv/config';
import { loadConfig } from '../config.mjs';
import { createPool } from '../db/pool.mjs';
import { hashPassword } from '../auth/passwords.mjs';

const config = loadConfig();
const username = process.env.ADMIN_INITIAL_USERNAME || 'admin';
const password = process.env.ADMIN_INITIAL_PASSWORD || '';

if (password.length < 12) {
  console.error('ADMIN_INITIAL_PASSWORD must be at least 12 characters');
  process.exit(1);
}

const pool = createPool(config);
const client = await pool.connect();

try {
  await client.query('begin');
  const existing = await client.query(
    `select u.id
     from app.users u
     join app.admin_accounts aa on aa.user_id = u.id
     where aa.username = $1`,
    [username],
  );

  const userId = existing.rows[0]?.id || (await client.query(
    `insert into app.users(account_type, display_name)
     values ('admin', $1)
     returning id`,
    [username],
  )).rows[0].id;

  await client.query(
    `insert into app.admin_accounts(user_id, username, password_hash, role)
     values ($1, $2, $3, 'admin')
     on conflict (username) do update set password_hash = excluded.password_hash, updated_at = now()`,
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
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add server/app.mjs server/routes/admin-auth-routes.mjs server/scripts/create-admin.mjs server/tests/app-routes.test.mjs
git commit -m "feat: add admin login api"
```

---

### Task 6: Add Customer Multi-Login Mock APIs

**Files:**
- Create: `server/routes/customer-auth-routes.mjs`
- Modify: `server/app.mjs`
- Test: `server/tests/customer-auth.test.mjs`

- [ ] **Step 1: Write customer auth behavior tests**

Create `server/tests/customer-auth.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createQrLoginSession, getQrLoginState } from '../routes/customer-auth-routes.mjs';

test('qr login session starts pending and expires at a fixed time', () => {
  const now = new Date('2026-05-30T00:00:00.000Z');
  const session = createQrLoginSession({ now, ttlSeconds: 180, token: 'abc' });

  assert.equal(session.status, 'pending');
  assert.equal(session.token, 'abc');
  assert.equal(session.expiresAt.toISOString(), '2026-05-30T00:03:00.000Z');
});

test('expired qr login state is reported as expired', () => {
  const session = {
    status: 'pending',
    expiresAt: new Date('2026-05-30T00:03:00.000Z'),
  };

  assert.equal(getQrLoginState(session, new Date('2026-05-30T00:03:01.000Z')), 'expired');
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```powershell
npm run test:server
```

Expected: FAIL because `customer-auth-routes.mjs` does not exist.

- [ ] **Step 3: Implement customer route helpers**

Create `server/routes/customer-auth-routes.mjs` with these exported helpers:

```js
import crypto from 'node:crypto';
import { requireSession } from '../middleware/require-session.mjs';
import { createSessionToken, createLoginSession, hashSessionToken } from '../auth/sessions.mjs';
import { hashPassword, verifyPassword } from '../auth/passwords.mjs';

export function createQrLoginSession({ now = new Date(), ttlSeconds, token = crypto.randomBytes(24).toString('base64url') }) {
  return {
    token,
    status: 'pending',
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
  };
}

export function getQrLoginState(session, now = new Date()) {
  if (!session) return 'missing';
  if (session.status === 'pending' && session.expiresAt <= now) return 'expired';
  return session.status;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '');
}
```

- [ ] **Step 4: Implement customer API routes**

Add to `server/routes/customer-auth-routes.mjs`:

```js
export function mountCustomerAuthRoutes(app, { pool, config }) {
  app.post('/destiny-api/customer/login/wechat', async (req, res) => {
    if (!config.customerAuthMocksEnabled) {
      res.status(503).json({ error: 'WeChat login provider is not configured' });
      return;
    }

    const code = String(req.body?.code || '').trim();
    if (!code) {
      res.status(400).json({ error: 'WeChat code is required' });
      return;
    }

    const subject = `mock-wechat-${code}`;
    const customer = await findOrCreateCustomerByIdentity(pool, {
      provider: 'wechat_mini',
      providerSubject: subject,
      displayName: '微信客户',
    });
    const token = await issueCustomerSession(pool, config, customer.id);
    res.json({ token, customer });
  });

  app.post('/destiny-api/customer/otp/send', async (req, res) => {
    if (!config.customerAuthMocksEnabled) {
      res.status(503).json({ error: 'SMS provider is not configured' });
      return;
    }

    const phone = normalizePhone(req.body?.phone);
    if (!/^1\d{10}$/.test(phone)) {
      res.status(400).json({ error: 'Valid mainland China phone number is required' });
      return;
    }

    const code = '246810';
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + config.smsCodeTtlSeconds * 1000);
    await pool.query(
      `insert into app.sms_otp_challenges(phone, code_hash, expires_at)
       values ($1, $2, $3)`,
      [phone, codeHash, expiresAt],
    );
    res.json({ ok: true, devCode: code, expiresAt });
  });

  app.post('/destiny-api/customer/otp/verify', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();
    const result = await pool.query(
      `select id, code_hash, attempts
       from app.sms_otp_challenges
       where phone = $1 and consumed_at is null and expires_at > now()
       order by created_at desc
       limit 1`,
      [phone],
    );
    const challenge = result.rows[0];
    if (!challenge || challenge.attempts >= 5 || !(await verifyPassword(code, challenge.code_hash))) {
      if (challenge) {
        await pool.query('update app.sms_otp_challenges set attempts = attempts + 1 where id = $1', [challenge.id]);
      }
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    await pool.query('update app.sms_otp_challenges set consumed_at = now() where id = $1', [challenge.id]);
    const customer = await findOrCreateCustomerByIdentity(pool, {
      provider: 'phone',
      providerSubject: phone,
      phone,
      displayName: '手机客户',
    });
    const token = await issueCustomerSession(pool, config, customer.id);
    res.json({ token, customer });
  });

  app.post('/destiny-api/customer/qr/create', async (_req, res) => {
    const session = createQrLoginSession({ ttlSeconds: config.qrLoginTtlSeconds });
    await pool.query(
      `insert into app.qr_login_sessions(token_hash, status, expires_at)
       values ($1, 'pending', $2)`,
      [hashSessionToken(session.token, config.sessionSecret), session.expiresAt],
    );
    res.json({ token: session.token, status: session.status, expiresAt: session.expiresAt });
  });

  app.get('/destiny-api/customer/qr/status/:token', async (req, res) => {
    const tokenHash = hashSessionToken(req.params.token, config.sessionSecret);
    const result = await pool.query(
      `select id, status, customer_id, expires_at as "expiresAt"
       from app.qr_login_sessions
       where token_hash = $1`,
      [tokenHash],
    );
    const session = result.rows[0];
    const state = getQrLoginState(session, new Date());

    if (state === 'missing') {
      res.status(404).json({ error: 'QR login session not found' });
      return;
    }

    if (state === 'expired') {
      await pool.query(
        `update app.qr_login_sessions set status = 'expired' where id = $1 and status = 'pending'`,
        [session.id],
      );
      res.json({ status: 'expired' });
      return;
    }

    if (state === 'confirmed' && session.customer_id) {
      const token = await issueCustomerSession(pool, config, session.customer_id);
      res.json({ status: 'confirmed', token });
      return;
    }

    res.json({ status: state });
  });

  app.post(
    '/destiny-api/customer/qr/confirm',
    requireSession({ pool, config, accountTypes: ['customer'] }),
    async (req, res) => {
      const qrToken = String(req.body?.token || '').trim();
      if (!qrToken) {
        res.status(400).json({ error: 'QR token is required' });
        return;
      }

      const tokenHash = hashSessionToken(qrToken, config.sessionSecret);
      const result = await pool.query(
        `update app.qr_login_sessions
         set status = 'confirmed', customer_id = $2, confirmed_at = now()
         where token_hash = $1 and status = 'pending' and expires_at > now()
         returning id`,
        [tokenHash, req.session.user_id],
      );

      if (!result.rowCount) {
        res.status(409).json({ error: 'QR login session cannot be confirmed' });
        return;
      }

      res.json({ ok: true });
    },
  );
}
```

- [ ] **Step 5: Add customer lookup helpers**

Add to the same file:

```js
async function findOrCreateCustomerByIdentity(pool, { provider, providerSubject, phone = null, displayName }) {
  const existing = await pool.query(
    `select u.id, u.display_name as "displayName", u.phone
     from app.customer_identities ci
     join app.users u on u.id = ci.customer_id
     where ci.provider = $1 and ci.provider_subject = $2`,
    [provider, providerSubject],
  );

  if (existing.rows[0]) return existing.rows[0];

  const client = await pool.connect();
  try {
    await client.query('begin');
    const user = await client.query(
      `insert into app.users(account_type, display_name, phone)
       values ('customer', $1, $2)
       returning id, display_name as "displayName", phone`,
      [displayName, phone],
    );
    await client.query(
      `insert into app.customer_identities(customer_id, provider, provider_subject, phone)
       values ($1, $2, $3, $4)`,
      [user.rows[0].id, provider, providerSubject, phone],
    );
    await client.query('commit');
    return user.rows[0];
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function issueCustomerSession(pool, config, customerId) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await createLoginSession(pool, {
    userId: customerId,
    accountType: 'customer',
    token,
    secret: config.sessionSecret,
    expiresAt,
  });
  return token;
}
```

- [ ] **Step 6: Mount customer routes**

Modify `server/app.mjs`:

```js
import { mountCustomerAuthRoutes } from './routes/customer-auth-routes.mjs';
```

Inside the `if (pool)` block:

```js
mountCustomerAuthRoutes(app, { pool, config });
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add server/app.mjs server/routes/customer-auth-routes.mjs server/tests/customer-auth.test.mjs
git commit -m "feat: add customer login mocks"
```

---

### Task 7: Add Internal Admin Shell

**Files:**
- Modify: `src/main.tsx`
- Create: `src/admin/AdminApp.tsx`
- Create: `src/admin/api.ts`
- Create: `src/admin/components/AdminLayout.tsx`
- Create: `src/admin/pages/LoginPage.tsx`
- Create: `src/admin/pages/DashboardPage.tsx`
- Create: `src/admin/pages/UsersPage.tsx`
- Test: `tests/test_phase1_admin_scaffold.py`

- [ ] **Step 1: Write static scaffold test**

Create `tests/test_phase1_admin_scaffold.py`:

```python
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class Phase1AdminScaffoldTests(unittest.TestCase):
    def test_admin_shell_files_exist(self):
        for relative in [
            "src/admin/AdminApp.tsx",
            "src/admin/api.ts",
            "src/admin/components/AdminLayout.tsx",
            "src/admin/pages/LoginPage.tsx",
            "src/admin/pages/DashboardPage.tsx",
            "src/admin/pages/UsersPage.tsx",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_admin_route_is_mounted_from_main(self):
        main = (ROOT / "src" / "main.tsx").read_text(encoding="utf-8")
        self.assertIn("window.location.pathname.startsWith('/admin')", main)
        self.assertIn("AdminApp", main)

    def test_admin_menu_contains_phase_one_sections(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        for label in ["总览", "用户管理", "会员与积分", "订单与支付", "系统设置"]:
            self.assertIn(label, layout)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```powershell
python -m unittest tests.test_phase1_admin_scaffold
```

Expected: FAIL because admin files do not exist.

- [ ] **Step 3: Create admin API helper**

Create `src/admin/api.ts`:

```ts
const API_BASE = '/destiny-api';

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: 'editor' | 'admin';
};

export async function adminLogin(username: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || '登录失败');
  }

  return body;
}
```

- [ ] **Step 4: Create admin layout**

Create `src/admin/components/AdminLayout.tsx`:

```tsx
import React from 'react';
import { BarChart3, CreditCard, Settings, Shield, Users } from 'lucide-react';

type AdminLayoutProps = {
  active: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
};

const navItems = [
  { key: 'dashboard', label: '总览', icon: BarChart3 },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'membership', label: '会员与积分', icon: Shield },
  { key: 'orders', label: '订单与支付', icon: CreditCard },
  { key: 'settings', label: '系统设置', icon: Settings },
];

export default function AdminLayout({ active, onNavigate, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-zinc-200 bg-white">
        <div className="px-5 py-4 text-lg font-semibold">甄算后台</div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  selected ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="ml-60 min-h-screen p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Create login page**

Create `src/admin/pages/LoginPage.tsx`:

```tsx
import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { adminLogin, AdminUser } from '../api';

type LoginPageProps = {
  onLogin: (token: string, user: AdminUser) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await adminLogin(username, password);
      onLogin(result.token, result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">甄算后台登录</h1>
        <div className="mt-5 space-y-4">
          <input className="w-full rounded-md border border-zinc-300 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号" />
          <input className="w-full rounded-md border border-zinc-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" type="password" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-60" disabled={loading} type="submit">
            <LogIn size={18} />
            <span>{loading ? '登录中' : '登录'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Create dashboard and users pages**

Create `src/admin/pages/DashboardPage.tsx`:

```tsx
export default function DashboardPage() {
  const metrics = [
    ['客户账号', '0'],
    ['后台账号', '0'],
    ['今日登录', '0'],
    ['待处理事项', '0'],
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">总览</h1>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm text-zinc-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

Create `src/admin/pages/UsersPage.tsx`:

```tsx
export default function UsersPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">用户管理</h1>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-4 border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600">
          <span>账号类型</span>
          <span>登录方式</span>
          <span>状态</span>
          <span>最近活动</span>
        </div>
        <div className="px-4 py-8 text-sm text-zinc-500">第一阶段先完成账号体系骨架，用户列表数据在接口接入后展示。</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Create admin app**

Create `src/admin/AdminApp.tsx`:

```tsx
import React, { useState } from 'react';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import { AdminUser } from './api';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('zhensuan_admin_token') || '');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [view, setView] = useState('dashboard');

  if (!token) {
    return (
      <LoginPage
        onLogin={(nextToken, nextUser) => {
          localStorage.setItem('zhensuan_admin_token', nextToken);
          setToken(nextToken);
          setUser(nextUser);
        }}
      />
    );
  }

  return (
    <AdminLayout active={view} onNavigate={setView}>
      {view === 'users' ? <UsersPage /> : <DashboardPage />}
      {user && <div className="mt-8 text-xs text-zinc-400">当前账号：{user.displayName || user.username}</div>}
    </AdminLayout>
  );
}
```

- [ ] **Step 8: Mount admin app from main**

Modify `src/main.tsx`:

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import './index.css';

const RootApp = window.location.pathname.startsWith('/admin') ? AdminApp : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
```

- [ ] **Step 9: Run admin scaffold tests**

Run:

```powershell
python -m unittest tests.test_phase1_admin_scaffold
```

Expected: PASS.

- [ ] **Step 10: Run frontend checks**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 11: Commit**

```powershell
git add src/main.tsx src/admin tests/test_phase1_admin_scaffold.py
git commit -m "feat: add admin shell"
```

---

### Task 8: Final Verification And Server Setup Notes

**Files:**
- Modify: `docs/superpowers/plans/2026-05-30-zhensuan-phase1-foundation.md` if execution discoveries require corrections.

- [ ] **Step 1: Run all local checks**

Run:

```powershell
npm run test:server
python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase1_admin_scaffold
npm run lint
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Run database migration locally or on the server**

With `DATABASE_URL` set for the PostgreSQL database:

```powershell
npm run db:migrate
```

Expected output contains:

```text
applied migration 001_phase1_auth
```

If the migration was already applied, expected output has no error and no duplicate table failure.

- [ ] **Step 3: Create the first platform admin**

With `ADMIN_INITIAL_USERNAME`, `ADMIN_INITIAL_PASSWORD`, `DATABASE_URL`, and `SESSION_SECRET` set:

```powershell
npm run admin:create
```

Expected output:

```text
admin account ready: <username>
```

- [ ] **Step 4: Start API and verify health**

Run:

```powershell
npm start
```

In another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3201/destiny-api/health
```

Expected response includes:

```text
ok    : True
model : deepseek-chat
```

- [ ] **Step 5: Verify admin path through Vite**

Run:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:3000/admin
```

Expected: the 甄算后台登录 page renders.

- [ ] **Step 6: Confirm whether a final correction commit is needed**

```powershell
git status --short
```

Expected: no output. If there is output, review each changed file and commit only the verified Phase 1 correction files with a specific message such as `fix: correct phase one auth migration`.

---

## Self-Review Checklist

- Spec coverage: Phase 1 covers backend login, customer multi-login design and mocks, role/session foundation, PostgreSQL base schema, admin shell, and verification.
- Scope control: Neo4j, MedusaJS, real WeChat/SMS/payment providers, report rule engine, and knowledge editing are intentionally deferred to separate plans.
- Security basics: Passwords are scrypt-hashed, session tokens are HMAC-hashed before storage, OTP and QR state are stored server-side, and customer identities are separated from login sessions.
- Test coverage: Native Node tests cover backend route and auth helpers; Python tests cover scaffold consistency; lint/build verify TypeScript and frontend packaging.
- Deployment readiness: The plan includes migration, first admin creation, API health check, and `/admin` browser smoke test.
