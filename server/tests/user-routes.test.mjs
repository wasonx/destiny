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
