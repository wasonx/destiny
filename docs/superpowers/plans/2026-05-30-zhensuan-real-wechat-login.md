# 甄算真实微信登录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace backend mock WeChat customer identities with real mini-program `wx.login` code exchange while preserving simulated phone login and the existing customer session model.

**Architecture:** The mini-program sends the `wx.login` code to the existing `/destiny-api/customer/login/wechat` endpoint. The backend exchanges the code through a focused WeChat session provider, persists `openid` / optional `unionid` in PostgreSQL, reuses existing customer identities, and returns the existing customer token. Tests inject a fake provider and fake pool so no live WeChat network call is required.

**Tech Stack:** Node.js, Express, PostgreSQL migrations, native WeChat mini-program JS, Node test runner, Python unittest scaffold checks.

---

## Source References

- Scope: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- Gap audit: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-gap-audit.md`
- WeChat official backend API reference: `https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html`

The WeChat backend exchange uses:

```text
GET https://api.weixin.qq.com/sns/jscode2session
  ?appid=...
  &secret=...
  &js_code=...
  &grant_type=authorization_code
```

The backend must never return `session_key` to the mini-program and must not write it to logs.

## File Structure

Create:

- `server/auth/wechat-session-provider.mjs`: focused provider for WeChat `code2Session`, including mock mode for local tests only.
- `server/db/migrations/007_phase7_wechat_identity.sql`: adds `openid`, `unionid`, `provider_payload`, and indexes to customer identities.
- `server/tests/wechat-session-provider.test.mjs`: unit tests for provider URL construction, response normalization, sanitized payload, and WeChat error handling.
- `server/tests/customer-auth-wechat.test.mjs`: route tests for missing code, new customer creation, existing identity reuse, and provider failure.

Modify:

- `server/config.mjs`: add WeChat login config.
- `.env.example`: document WeChat login variables without secrets.
- `server/app.mjs`: allow injecting `wechatSessionProvider` for tests.
- `server/routes/customer-auth-routes.mjs`: replace `mock-wechat-${code}` with real provider result and account reuse logic.
- `miniprogram/utils/auth.js`: remove `mock-code` fallback and reject when `wx.login` returns no code.
- `tests/test_phase6_online_integration_scaffold.py`: assert mini-program uses real `wx.login` code and does not send `mock-code`.

Do not modify:

- `server/commerce/payment-providers/wechat-placeholder-provider.mjs`: payment stays placeholder.
- Tencent SMS provider code: phone login stays simulated.
- `miniprogram/project.config.json`: current `libVersion` change is unrelated and should remain untouched unless the user asks.

## Data Contract

Backend route request:

```json
{
  "code": "wx-login-js-code"
}
```

Backend route success response:

```json
{
  "token": "customer-session-token",
  "customer": {
    "id": "customer-user-id",
    "provider": "wechat",
    "openid": "wechat-openid",
    "unionid": "wechat-unionid-or-null"
  }
}
```

Backend route error responses:

```json
{ "error": "WECHAT_CODE_REQUIRED" }
{ "error": "WECHAT_LOGIN_NOT_CONFIGURED" }
{ "error": "WECHAT_CODE_SESSION_FAILED" }
{ "error": "WECHAT_OPENID_MISSING" }
```

## Task 1: Add WeChat Login Config And Provider

**Files:**

- Create: `server/auth/wechat-session-provider.mjs`
- Modify: `server/config.mjs`
- Modify: `.env.example`
- Test: `server/tests/wechat-session-provider.test.mjs`

- [ ] **Step 1: Write provider tests**

Create `server/tests/wechat-session-provider.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWechatSessionProvider, WechatSessionError } from '../auth/wechat-session-provider.mjs';
import { loadConfig } from '../config.mjs';

test('wechat provider exchanges code with configured code2session endpoint', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return {
          openid: 'openid-1',
          unionid: 'unionid-1',
          session_key: 'do-not-store-or-return',
        };
      },
    };
  };
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_MINIPROGRAM_SECRET: 'app-secret',
    WECHAT_CODE2SESSION_URL: 'https://api.weixin.qq.com/sns/jscode2session',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl });

  const session = await provider.exchange('code-123');
  const url = new URL(requestedUrl);

  assert.equal(url.origin + url.pathname, 'https://api.weixin.qq.com/sns/jscode2session');
  assert.equal(url.searchParams.get('appid'), 'app-id');
  assert.equal(url.searchParams.get('secret'), 'app-secret');
  assert.equal(url.searchParams.get('js_code'), 'code-123');
  assert.equal(url.searchParams.get('grant_type'), 'authorization_code');
  assert.deepEqual(session, {
    openid: 'openid-1',
    unionid: 'unionid-1',
    providerPayload: {
      endpoint: 'https://api.weixin.qq.com/sns/jscode2session',
      hasUnionid: true,
      mode: 'real',
    },
  });
});

test('wechat provider rejects missing app secret when mock mode is disabled', async () => {
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_LOGIN_MOCKS_ENABLED: 'false',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl: async () => assert.fail('fetch should not be called') });

  await assert.rejects(
    provider.exchange('code-123'),
    (error) => error instanceof WechatSessionError && error.code === 'WECHAT_LOGIN_NOT_CONFIGURED',
  );
});

test('wechat provider supports explicit local mock mode', async () => {
  const config = loadConfig({
    WECHAT_LOGIN_MOCKS_ENABLED: 'true',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl: async () => assert.fail('fetch should not be called') });

  assert.deepEqual(await provider.exchange('code-123'), {
    openid: 'mock-openid-code-123',
    unionid: null,
    providerPayload: {
      mode: 'mock',
    },
  });
});

test('wechat provider maps WeChat API errors to typed error', async () => {
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_MINIPROGRAM_SECRET: 'app-secret',
  });
  const provider = createWechatSessionProvider({
    config,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { errcode: 40029, errmsg: 'invalid code' };
      },
    }),
  });

  await assert.rejects(
    provider.exchange('bad-code'),
    (error) => error instanceof WechatSessionError && error.code === 'WECHAT_CODE_SESSION_FAILED' && error.wechatCode === 40029,
  );
});
```

- [ ] **Step 2: Run provider tests and verify they fail**

Run:

```bash
node --test server/tests/wechat-session-provider.test.mjs
```

Expected:

```text
ERR_MODULE_NOT_FOUND
```

because `server/auth/wechat-session-provider.mjs` does not exist yet.

- [ ] **Step 3: Add config fields**

Modify `server/config.mjs` so `loadConfig` returns these fields:

```js
    wechatMiniProgramAppId: env.WECHAT_MINIPROGRAM_APP_ID || '',
    wechatMiniProgramSecret: env.WECHAT_MINIPROGRAM_SECRET || '',
    wechatCode2SessionUrl: env.WECHAT_CODE2SESSION_URL || 'https://api.weixin.qq.com/sns/jscode2session',
    wechatLoginMocksEnabled: env.WECHAT_LOGIN_MOCKS_ENABLED === 'true',
```

Keep `customerAuthMocksEnabled`, SMS config, and payment config unchanged.

- [ ] **Step 4: Document environment variables**

Add to `.env.example` near customer auth:

```dotenv
WECHAT_MINIPROGRAM_APP_ID="wxc4ed7c07ce86326c"
WECHAT_MINIPROGRAM_SECRET=""
WECHAT_CODE2SESSION_URL="https://api.weixin.qq.com/sns/jscode2session"
WECHAT_LOGIN_MOCKS_ENABLED="false"
```

Do not put the real AppSecret into the repository.

- [ ] **Step 5: Implement the provider**

Create `server/auth/wechat-session-provider.mjs`:

```js
export class WechatSessionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WechatSessionError';
    this.code = code;
    Object.assign(this, details);
  }
}

function sanitizeCode(code) {
  return String(code || '').trim();
}

function sanitizePayload(payload, endpoint, mode) {
  return {
    endpoint,
    hasUnionid: Boolean(payload.unionid),
    mode,
  };
}

export function createWechatSessionProvider({ config, fetchImpl = fetch } = {}) {
  const endpoint = config?.wechatCode2SessionUrl || 'https://api.weixin.qq.com/sns/jscode2session';

  return {
    async exchange(rawCode) {
      const code = sanitizeCode(rawCode);
      if (!code) {
        throw new WechatSessionError('WECHAT_CODE_REQUIRED', 'WeChat login code is required');
      }

      if (config?.wechatLoginMocksEnabled) {
        return {
          openid: `mock-openid-${code}`,
          unionid: null,
          providerPayload: { mode: 'mock' },
        };
      }

      if (!config?.wechatMiniProgramAppId || !config?.wechatMiniProgramSecret) {
        throw new WechatSessionError('WECHAT_LOGIN_NOT_CONFIGURED', 'WeChat mini-program app id or secret is not configured');
      }

      const url = new URL(endpoint);
      url.searchParams.set('appid', config.wechatMiniProgramAppId);
      url.searchParams.set('secret', config.wechatMiniProgramSecret);
      url.searchParams.set('js_code', code);
      url.searchParams.set('grant_type', 'authorization_code');

      let response;
      try {
        response = await fetchImpl(url);
      } catch (error) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session network request failed', { cause: error });
      }

      if (!response.ok) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session HTTP request failed', { status: response.status });
      }

      const payload = await response.json();
      if (payload.errcode) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session returned an error', {
          wechatCode: payload.errcode,
          wechatMessage: payload.errmsg || '',
        });
      }

      if (!payload.openid) {
        throw new WechatSessionError('WECHAT_OPENID_MISSING', 'WeChat code2session response did not include openid');
      }

      return {
        openid: payload.openid,
        unionid: payload.unionid || null,
        providerPayload: sanitizePayload(payload, endpoint, 'real'),
      };
    },
  };
}
```

- [ ] **Step 6: Run provider tests and verify they pass**

Run:

```bash
node --test server/tests/wechat-session-provider.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 7: Commit provider work**

Run:

```bash
git add server/auth/wechat-session-provider.mjs server/config.mjs .env.example server/tests/wechat-session-provider.test.mjs
git commit -m "feat: add wechat login session provider"
```

## Task 2: Add WeChat Identity Columns

**Files:**

- Create: `server/db/migrations/007_phase7_wechat_identity.sql`
- Test: `server/tests/customer-auth-wechat.test.mjs`

- [ ] **Step 1: Create migration**

Create `server/db/migrations/007_phase7_wechat_identity.sql`:

```sql
alter table app.customer_identities
  add column if not exists openid text,
  add column if not exists unionid text,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_identities_wechat_openid_uidx
  on app.customer_identities(provider, openid)
  where provider = 'wechat' and openid is not null;

create unique index if not exists customer_identities_wechat_unionid_uidx
  on app.customer_identities(provider, unionid)
  where provider = 'wechat' and unionid is not null;

create index if not exists customer_identities_user_provider_idx
  on app.customer_identities(user_id, provider);
```

- [ ] **Step 2: Verify migration command**

Run:

```bash
npm run db:migrate
```

Expected:

```text
```

The command should exit `0`. If local PostgreSQL is not running, record the failure and run server tests instead; do not fake a successful migration.

- [ ] **Step 3: Commit migration**

Run:

```bash
git add server/db/migrations/007_phase7_wechat_identity.sql
git commit -m "feat: store wechat identity fields"
```

## Task 3: Wire Real WeChat Identity Into Customer Login Route

**Files:**

- Modify: `server/app.mjs`
- Modify: `server/routes/customer-auth-routes.mjs`
- Test: `server/tests/customer-auth-wechat.test.mjs`

- [ ] **Step 1: Write route tests**

Create `server/tests/customer-auth-wechat.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function createRouteTestServer({ pool, provider }) {
  const app = createApp({
    config: loadConfig({ SESSION_SECRET: 'test-secret' }),
    pool,
    wechatSessionProvider: provider,
  });
  return app.listen(0);
}

function createMockPool({ existingUserId = null } = {}) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (['begin', 'commit', 'rollback'].includes(normalized)) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes('from app.customer_identities') && normalized.includes("provider = 'wechat'")) {
        return existingUserId ? { rows: [{ user_id: existingUserId }], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (normalized.includes('insert into app.users')) {
        return { rows: [{ id: 'new-user-1' }], rowCount: 1 };
      }
      if (normalized.includes('insert into app.customer_identities')) {
        return { rows: [], rowCount: 1 };
      }
      if (normalized.includes('update app.customer_identities')) {
        return { rows: [], rowCount: 1 };
      }
      if (normalized.includes('insert into app.login_sessions')) {
        return { rows: [{ id: 'session-1' }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${normalized}`);
    },
    release() {},
  };
  return {
    queries,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test('wechat customer login requires code', async () => {
  const { pool } = createMockPool();
  const server = createRouteTestServer({
    pool,
    provider: { exchange: async () => assert.fail('provider should not be called') },
  });
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/login/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'WECHAT_CODE_REQUIRED' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('wechat customer login creates a customer for a new openid', async () => {
  const { pool, queries } = createMockPool();
  const server = createRouteTestServer({
    pool,
    provider: {
      async exchange(code) {
        assert.equal(code, 'wx-code-1');
        return {
          openid: 'openid-1',
          unionid: 'unionid-1',
          providerPayload: { mode: 'real', hasUnionid: true },
        };
      },
    },
  });
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/login/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'wx-code-1' }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.customer.id, 'new-user-1');
    assert.equal(data.customer.openid, 'openid-1');
    assert.equal(data.customer.unionid, 'unionid-1');
    assert.ok(data.token);
    assert.ok(queries.some((query) => query.sql.includes('insert into app.users')));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.customer_identities')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('wechat customer login reuses an existing identity', async () => {
  const { pool, queries } = createMockPool({ existingUserId: 'existing-user-1' });
  const server = createRouteTestServer({
    pool,
    provider: {
      async exchange() {
        return {
          openid: 'openid-1',
          unionid: null,
          providerPayload: { mode: 'real', hasUnionid: false },
        };
      },
    },
  });
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/login/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'wx-code-1' }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.customer.id, 'existing-user-1');
    assert.ok(!queries.some((query) => query.sql.includes('insert into app.users')));
    assert.ok(queries.some((query) => query.sql.includes('update app.customer_identities')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

- [ ] **Step 2: Run route tests and verify they fail**

Run:

```bash
node --test server/tests/customer-auth-wechat.test.mjs
```

Expected:

```text
not ok
```

because `createApp` does not accept `wechatSessionProvider` and the route still uses `mock-wechat-${code}`.

- [ ] **Step 3: Allow provider injection**

Modify `server/app.mjs`:

```js
export function createApp({ config, pool = null, graphDriver = null, wechatSessionProvider = null } = {}) {
```

and update the customer auth mount:

```js
  mountCustomerAuthRoutes(app, { config, pool, wechatSessionProvider });
```

- [ ] **Step 4: Import provider in customer routes**

Modify `server/routes/customer-auth-routes.mjs` imports:

```js
import { createHash } from 'node:crypto';
import { createLoginSession, createSessionToken } from '../auth/sessions.mjs';
import { createWechatSessionProvider, WechatSessionError } from '../auth/wechat-session-provider.mjs';
import { memory, nextId } from './memory-state.mjs';
```

- [ ] **Step 5: Add route helper functions**

Add these helpers above `mountCustomerAuthRoutes`:

```js
function buildWechatSubject({ openid, unionid }) {
  return unionid ? `unionid:${unionid}` : `openid:${openid}`;
}

async function findWechatUserId(client, { openid, unionid, subject }) {
  const result = await client.query(
    `
      select user_id
      from app.customer_identities
      where provider = 'wechat'
        and (
          provider_subject = $1
          or ($2::text is not null and unionid = $2)
          or openid = $3
        )
      order by created_at asc
      limit 1
    `,
    [subject, unionid, openid],
  );
  return result.rows[0]?.user_id || null;
}

async function upsertWechatIdentity(client, { userId, openid, unionid, subject, providerPayload }) {
  const updated = await client.query(
    `
      update app.customer_identities
      set provider_subject = $2,
          openid = $3,
          unionid = $4,
          provider_payload = $5,
          updated_at = now()
      where provider = 'wechat'
        and user_id = $1
      returning id
    `,
    [userId, subject, openid, unionid, providerPayload],
  );
  if (updated.rowCount) {
    return;
  }
  await client.query(
    `
      insert into app.customer_identities(user_id, provider, provider_subject, openid, unionid, provider_payload)
      values ($1, 'wechat', $2, $3, $4, $5)
    `,
    [userId, subject, openid, unionid, providerPayload],
  );
}
```

- [ ] **Step 6: Replace WeChat login route body**

In `mountCustomerAuthRoutes`, create the provider once:

```js
export function mountCustomerAuthRoutes(app, { config, pool, wechatSessionProvider = null }) {
  const wechatProvider = wechatSessionProvider || createWechatSessionProvider({ config });
```

Replace the `/customer/login/wechat` route with:

```js
  app.post('/destiny-api/customer/login/wechat', async (req, res) => {
    const code = String(req.body?.code || '').trim();
    if (!code) {
      res.status(400).json({ error: 'WECHAT_CODE_REQUIRED' });
      return;
    }

    if (!pool) {
      if (!config.wechatLoginMocksEnabled && !config.customerAuthMocksEnabled) {
        res.status(503).json({ error: 'WECHAT_LOGIN_NOT_CONFIGURED' });
        return;
      }
      const session = await wechatProvider.exchange(code);
      res.json({
        token: memory.customerToken,
        customer: {
          id: 'dev-customer',
          provider: 'wechat',
          openid: session.openid,
          unionid: session.unionid,
        },
      });
      return;
    }

    let wechatSession;
    try {
      wechatSession = await wechatProvider.exchange(code);
    } catch (error) {
      if (error instanceof WechatSessionError) {
        const status = error.code === 'WECHAT_CODE_REQUIRED' ? 400 : 502;
        res.status(status).json({ error: error.code });
        return;
      }
      throw error;
    }

    const subject = buildWechatSubject(wechatSession);
    const client = await pool.connect();
    try {
      await client.query('begin');
      let userId = await findWechatUserId(client, { ...wechatSession, subject });
      if (!userId) {
        const user = await client.query("insert into app.users(account_type, display_name) values ('customer', '微信客户') returning id");
        userId = user.rows[0].id;
      }
      await upsertWechatIdentity(client, {
        userId,
        openid: wechatSession.openid,
        unionid: wechatSession.unionid,
        subject,
        providerPayload: wechatSession.providerPayload,
      });
      const { token } = await createLoginSession(client, { config, userId, accountType: 'customer' });
      await client.query('commit');
      res.json({
        token,
        customer: {
          id: userId,
          provider: 'wechat',
          openid: wechatSession.openid,
          unionid: wechatSession.unionid,
        },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });
```

- [ ] **Step 7: Run route tests and adjust SQL stubs only if needed**

Run:

```bash
node --test server/tests/customer-auth-wechat.test.mjs
```

Expected:

```text
# pass
```

If a fake pool query string differs, update only the test stub query matching. Do not change behavior to satisfy a weak test.

- [ ] **Step 8: Commit route work**

Run:

```bash
git add server/app.mjs server/routes/customer-auth-routes.mjs server/tests/customer-auth-wechat.test.mjs
git commit -m "feat: use real wechat identity for customer login"
```

## Task 4: Remove Mini-Program Mock Code Fallback

**Files:**

- Modify: `miniprogram/utils/auth.js`
- Modify: `tests/test_phase6_online_integration_scaffold.py`

- [ ] **Step 1: Add scaffold assertion**

Modify `tests/test_phase6_online_integration_scaffold.py` to assert these strings:

```python
auth_js = (ROOT / "miniprogram" / "utils" / "auth.js").read_text(encoding="utf-8")
self.assertIn("wx.login", auth_js)
self.assertIn("code: loginRes.code", auth_js)
self.assertNotIn("mock-code", auth_js)
self.assertNotIn("loginRes.code ||", auth_js)
```

Use the existing test class and helper style in that file.

- [ ] **Step 2: Run scaffold test and verify it fails**

Run:

```bash
python -m unittest tests.test_phase6_online_integration_scaffold
```

Expected:

```text
FAIL
```

because `miniprogram/utils/auth.js` still sends `loginRes.code || 'mock-code'`.

- [ ] **Step 3: Update mini-program auth**

Modify `miniprogram/utils/auth.js`:

```js
function loginWithWechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('WECHAT_CODE_MISSING'));
          return;
        }
        api.request('/customer/login/wechat', {
          method: 'POST',
          data: {
            code: loginRes.code,
          },
        }).then((data) => {
          if (data && data.token) {
            setToken(data.token);
          }
          resolve(data);
        }).catch(reject);
      },
      fail(error) {
        reject(error);
      },
    });
  });
}
```

- [ ] **Step 4: Run mini-program scaffold checks**

Run:

```bash
python -m unittest tests.test_phase6_online_integration_scaffold
npm run test:miniprogram
```

Expected:

```text
OK
```

and the mini-program validator exits `0`.

- [ ] **Step 5: Commit mini-program auth work**

Run:

```bash
git add miniprogram/utils/auth.js tests/test_phase6_online_integration_scaffold.py
git commit -m "fix: require real wechat login code in miniprogram"
```

## Task 5: Full Verification

**Files:**

- Modify only if verification finds a real defect in files touched above.

- [ ] **Step 1: Run server tests**

Run:

```bash
npm run test:server
```

Expected:

```text
# pass
```

- [ ] **Step 2: Run Python scaffold tests**

Run:

```bash
npm run test:py
```

Expected:

```text
OK
```

- [ ] **Step 3: Run mini-program validation**

Run:

```bash
npm run test:miniprogram
```

Expected:

```text
```

The command exits `0`.

- [ ] **Step 4: Run type check**

Run:

```bash
npm run lint
```

Expected:

```text
```

The command exits `0`.

- [ ] **Step 5: Run frontend build**

Run:

```bash
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 6: Verify no forbidden integrations were added**

Run:

```bash
rg -n "mchid|商户号|apiclient|wechatpay|WECHAT_PAY|tencentcloud-sdk-nodejs|SmsClient|SendSms|TENCENT_SECRET" server miniprogram src .env.example
```

Expected:

```text
```

No output related to real WeChat Pay, real refund, or real Tencent SMS integration. Existing placeholder names such as `wechat-placeholder-provider.mjs` are allowed.

- [ ] **Step 7: Commit verification fix if one was needed**

If verification required a fix, run:

```bash
git add <changed-files>
git commit -m "fix: stabilize wechat login verification"
```

If no fix was needed, do not create an empty commit.

## Task 6: Deployment Notes

**Files:**

- Modify: deployment runbook if a deployment document already exists and needs the new WeChat variables.

- [ ] **Step 1: Configure production environment**

On the server, set:

```dotenv
WECHAT_MINIPROGRAM_APP_ID="wxc4ed7c07ce86326c"
WECHAT_MINIPROGRAM_SECRET="<set on server only>"
WECHAT_CODE2SESSION_URL="https://api.weixin.qq.com/sns/jscode2session"
WECHAT_LOGIN_MOCKS_ENABLED="false"
```

Do not print the real AppSecret in chat, logs, commits, or screenshots.

- [ ] **Step 2: Apply migration**

Run on server:

```bash
npm run db:migrate
```

Expected:

```text
```

The command exits `0`.

- [ ] **Step 3: Restart backend**

Use the existing process manager command for the deployed API. After restart, verify:

```bash
curl -fsS https://www.goye.cc/destiny-api/health
```

Expected:

```json
{"ok":true,"model":"deepseek-chat","hasKey":true}
```

The exact `model` and `hasKey` values may differ by environment; `ok` must be `true`.

- [ ] **Step 4: Verify with WeChat DevTools**

In WeChat DevTools using AppID `wxc4ed7c07ce86326c`:

```text
1. Open the mini-program project.
2. Compile.
3. Trigger login.
4. Confirm the backend response includes customer token.
5. Confirm the app can call customer-only APIs with that token.
```

Expected:

```text
登录成功，且后台 customer_identities 表有 provider='wechat'、openid 非空的记录。
```

## Rollback Plan

If production WeChat login fails after deployment:

```text
1. Set WECHAT_LOGIN_MOCKS_ENABLED="true" only for emergency local-style login testing.
2. Restart backend.
3. Keep the database migration; it is additive.
4. Inspect backend logs for WECHAT_CODE_SESSION_FAILED or WECHAT_LOGIN_NOT_CONFIGURED.
5. Restore WECHAT_LOGIN_MOCKS_ENABLED="false" before external release.
```

Do not revert to `mock-wechat-${code}` in code. If the issue is AppSecret or WeChat platform configuration, fix the environment or platform setting.

## Self-Review Notes

- Real WeChat login: covered by provider, route, database, mini-program, and deployment tasks.
- Phone login: untouched except shared route file; it remains simulated.
- WeChat Pay: explicitly untouched and verified by forbidden integration scan.
- Tencent SMS: explicitly untouched and verified by forbidden integration scan.
- Existing session model: preserved through `createLoginSession`.
- Security: `session_key` is neither returned to the client nor stored in provider payload.
- Current unrelated worktree change: `miniprogram/project.config.json` is not part of this plan.
