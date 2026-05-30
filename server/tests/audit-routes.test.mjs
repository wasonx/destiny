import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('admin audit logs route requires platform admin and supports filters', async () => {
  const queries = [];
  let sessionRole = 'editor';
  const pool = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (text.includes('from app.login_sessions')) {
        return {
          rows: [{
            session_id: 'session-1',
            account_type: sessionRole,
            user_id: 'admin-1',
            status: 'active',
            display_name: '平台管理员',
          }],
          rowCount: 1,
        };
      }
      if (text.includes('from app.audit_logs')) {
        return {
          rows: [{
            id: 'audit-1',
            actor_user_id: 'admin-1',
            actor_name: '平台管理员',
            action: 'customer_identity.unlink',
            target_type: 'customer',
            target_id: 'customer-1',
            metadata: { identityId: 'identity-1' },
            created_at: '2026-05-30T00:00:00.000Z',
          }],
          rowCount: 1,
        };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const editorResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/audit-logs`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(editorResponse.status, 403);

    sessionRole = 'admin';
    const response = await fetch(
      `http://127.0.0.1:${port}/destiny-api/admin/audit-logs?action=customer_identity.unlink&targetType=customer&targetId=customer-1`,
      { headers: { Authorization: 'Bearer admin-token' } },
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.auditLogs.length, 1);
    assert.equal(data.auditLogs[0].action, 'customer_identity.unlink');
    assert.equal(data.auditLogs[0].actor_name, '平台管理员');
    assert.ok(queries.some((query) => query.sql.includes('from app.audit_logs') && query.params[0] === 'customer_identity.unlink'));
    assert.ok(queries.some((query) => query.sql.includes('target_type = coalesce')));
    assert.ok(queries.some((query) => query.sql.includes('limit $4') && query.params[3] === 100));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
