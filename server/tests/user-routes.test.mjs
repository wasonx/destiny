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

test('admin users route binds customer identity with conflict detection and audit log', async () => {
  const queries = [];
  let sessionRole = 'editor';
  let conflictingIdentity = null;
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('from app.users') && text.includes("account_type = 'customer'") && text.includes('for update')) {
        return {
          rows: [{ id: params[0], account_type: 'customer', status: 'active' }],
          rowCount: 1,
        };
      }
      if (text.includes('from app.customer_identities') && text.includes('provider_subject = $2') && text.includes('for update')) {
        return { rows: conflictingIdentity ? [conflictingIdentity] : [], rowCount: conflictingIdentity ? 1 : 0 };
      }
      if (text.startsWith('insert into app.customer_identities')) {
        return {
          rows: [{
            id: 'identity-new',
            user_id: params[0],
            provider: params[1],
            provider_subject: params[2],
            phone: params[3],
            openid: params[4],
            unionid: params[5],
          }],
          rowCount: 1,
        };
      }
      if (text.startsWith('update app.users set phone')) return { rows: [], rowCount: 1 };
      if (text.includes('insert into app.audit_logs')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected client query: ${text}`);
    },
    release() {},
  };
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params: [] });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: 'admin-1', status: 'active', display_name: '绠＄悊鍛?' }] };
      }
      throw new Error(`Unexpected pool query: ${text}`);
    },
    connect: async () => client,
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const forbidden = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'phone', phone: '13900000000' }),
    });
    assert.equal(forbidden.status, 403);

    sessionRole = 'admin';
    conflictingIdentity = { id: 'identity-other', user_id: 'customer-other', provider: 'phone', provider_subject: '13900000000' };
    const conflict = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'phone', phone: '13900000000' }),
    });
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { error: 'IDENTITY_ALREADY_BOUND', boundUserId: 'customer-other' });

    conflictingIdentity = null;
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/customer-1/identities`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'phone', phone: '13900000000', reason: 'support verified phone' }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.identity.id, 'identity-new');
    assert.equal(data.identity.provider, 'phone');
    assert.equal(data.identity.provider_subject, '13900000000');
    assert.ok(queries.some((query) => query.sql.includes('insert into app.customer_identities') && query.params[0] === 'customer-1' && query.params[1] === 'phone' && query.params[2] === '13900000000'));
    assert.ok(queries.some((query) => query.sql.includes('update app.users set phone') && query.params[0] === '13900000000' && query.params[1] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs') && query.params[1] === 'customer_identity.bind' && query.params[3] === 'customer-1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin users route merges customer accounts across identities and business records', async () => {
  const queries = [];
  let sessionRole = 'editor';
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('from app.users') && text.includes('for update')) {
        return {
          rows: [
            { id: params[0], account_type: 'customer', status: 'active' },
            { id: params[1], account_type: 'customer', status: 'active' },
          ],
          rowCount: 2,
        };
      }
      if (text.startsWith('update app.customer_identities set user_id')) return { rows: [], rowCount: 2 };
      if (text.startsWith('update app.login_sessions set user_id')) return { rows: [], rowCount: 1 };
      if (text.startsWith('update app.qr_login_sessions set customer_id')) return { rows: [], rowCount: 1 };
      if (text.startsWith('update app.report_runs set customer_id')) return { rows: [], rowCount: 3 };
      if (text.startsWith('update app.customer_memberships set customer_id')) return { rows: [], rowCount: 1 };
      if (text.startsWith('update app.customer_addresses set customer_id')) return { rows: [], rowCount: 2 };
      if (text.startsWith('update app.commerce_orders set customer_id')) return { rows: [], rowCount: 2 };
      if (text.startsWith('update app.refund_requests set customer_id')) return { rows: [], rowCount: 1 };
      if (text.startsWith('update app.entitlement_ledger set customer_id')) return { rows: [], rowCount: 2 };
      if (text.startsWith('update app.points_ledger set customer_id')) return { rows: [], rowCount: 2 };
      if (text.startsWith('insert into app.entitlement_accounts')) return { rows: [], rowCount: 1 };
      if (text.startsWith('delete from app.entitlement_accounts')) return { rows: [], rowCount: 1 };
      if (text.startsWith('insert into app.points_accounts')) return { rows: [], rowCount: 1 };
      if (text.startsWith('delete from app.points_accounts')) return { rows: [], rowCount: 1 };
      if (text.startsWith('update app.users set status')) return { rows: [], rowCount: 1 };
      if (text.includes('insert into app.audit_logs')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected client query: ${text}`);
    },
    release() {},
  };
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params: [] });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: 'admin-1', status: 'active', display_name: '绠＄悊鍛?' }] };
      }
      throw new Error(`Unexpected pool query: ${text}`);
    },
    connect: async () => client,
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const forbidden = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/target-customer/merge-customer`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUserId: 'source-customer' }),
    });
    assert.equal(forbidden.status, 403);

    sessionRole = 'admin';
    const sameCustomer = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/target-customer/merge-customer`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUserId: 'target-customer' }),
    });
    assert.equal(sameCustomer.status, 400);
    assert.deepEqual(await sameCustomer.json(), { error: 'MERGE_TARGET_SAME_AS_SOURCE' });

    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/users/target-customer/merge-customer`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUserId: 'source-customer', reason: 'same person confirmed' }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.targetUserId, 'target-customer');
    assert.equal(data.sourceUserId, 'source-customer');
    assert.ok(queries.some((query) => query.sql.includes('from app.users') && query.sql.includes('for update') && query.params[0] === 'target-customer' && query.params[1] === 'source-customer'));
    for (const table of [
      'customer_identities',
      'login_sessions',
      'qr_login_sessions',
      'report_runs',
      'customer_memberships',
      'customer_addresses',
      'commerce_orders',
      'refund_requests',
      'entitlement_ledger',
      'points_ledger',
    ]) {
      assert.ok(queries.some((query) => query.sql.includes(`update app.${table}`)), `expected ${table} to be moved`);
    }
    assert.ok(queries.some((query) => query.sql.includes('insert into app.entitlement_accounts')));
    assert.ok(queries.some((query) => query.sql.includes('delete from app.entitlement_accounts') && query.params[0] === 'source-customer'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.points_accounts')));
    assert.ok(queries.some((query) => query.sql.includes('delete from app.points_accounts') && query.params[0] === 'source-customer'));
    assert.ok(queries.some((query) => query.sql.includes('update app.users set status') && query.params[0] === 'source-customer'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs') && query.params[1] === 'customer.merge' && query.params[3] === 'target-customer'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
