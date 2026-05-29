import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';
import { WechatSessionError } from '../auth/wechat-session-provider.mjs';

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
        return existingUserId ? { rows: [{ id: 'identity-1' }], rowCount: 1 } : { rows: [], rowCount: 0 };
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

test('wechat customer login maps provider errors to stable responses', async () => {
  const { pool } = createMockPool();
  const server = createRouteTestServer({
    pool,
    provider: {
      async exchange() {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'invalid code');
      },
    },
  });
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/login/wechat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'bad-code' }),
    });

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'WECHAT_CODE_SESSION_FAILED' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
