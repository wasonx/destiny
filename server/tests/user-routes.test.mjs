import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('admin users route requires platform admin and returns account identities', async () => {
  const queries = [];
  let sessionRole = 'editor';
  const pool = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: 'admin-1', status: 'active', display_name: '管理员' }] };
      }
      if (text.includes('from app.users')) {
        return {
          rows: [
            {
              id: 'customer-1',
              account_type: 'customer',
              status: 'active',
              display_name: '客户',
              phone: '13800000000',
              username: null,
              role: null,
              identities: [{ provider: 'wechat', provider_subject: 'openid-1', phone: null }],
            },
            {
              id: 'editor-1',
              account_type: 'editor',
              status: 'active',
              display_name: '编辑',
              phone: null,
              username: 'editor',
              role: 'editor',
              identities: [],
            },
          ],
        };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const editorResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(editorResponse.status, 403);

    sessionRole = 'admin';
    const adminResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users?accountType=customer`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    const data = await adminResponse.json();

    assert.equal(adminResponse.status, 200);
    assert.equal(data.users.length, 2);
    assert.equal(data.users[0].account_type, 'customer');
    assert.equal(data.users[0].identities[0].provider, 'wechat');
    assert.ok(queries.some((query) => query.sql.includes('from app.users') && query.params[0] === 'customer'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin users route unlinks customer identity with audit log and keeps last login identity', async () => {
  const queries = [];
  let sessionRole = 'admin';
  let identityCount = 2;
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('from app.customer_identities ci') && text.includes('for update')) {
        if (params[0] === 'missing-identity') {
          return { rows: [], rowCount: 0 };
        }
        return {
          rows: [{
            id: params[1],
            user_id: params[0],
            provider: 'phone',
            provider_subject: '13800000000',
            phone: '13800000000',
          }],
          rowCount: 1,
        };
      }
      if (text.includes('count(*)::int as identity_count')) {
        return { rows: [{ identity_count: identityCount }], rowCount: 1 };
      }
      if (text.includes('delete from app.customer_identities')) {
        identityCount -= 1;
        return { rows: [], rowCount: 1 };
      }
      if (text.includes('insert into app.audit_logs')) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected client query: ${text}`);
    },
    release() {},
  };
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params: [] });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: 'admin-1', status: 'active', display_name: '管理员' }] };
      }
      throw new Error(`Unexpected pool query: ${text}`);
    },
    connect: async () => client,
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    sessionRole = 'editor';
    const forbidden = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities/identity-1`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(forbidden.status, 403);

    sessionRole = 'admin';
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities/identity-1`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.identity.provider, 'phone');
    assert.ok(queries.some((query) => query.sql.includes('delete from app.customer_identities') && query.params?.[0] === 'identity-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs') && query.params?.[1] === 'customer_identity.unlink'));

    const lastIdentityResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities/identity-2`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(lastIdentityResponse.status, 400);
    assert.deepEqual(await lastIdentityResponse.json(), { error: 'CANNOT_REMOVE_LAST_IDENTITY' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
