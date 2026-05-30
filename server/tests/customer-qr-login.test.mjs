import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function createQrPool() {
  const queries = [];
  const qrSessions = new Map();
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });

      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }

      if (text.includes('from app.login_sessions')) {
        return {
          rows: [
            {
              session_id: 'session-1',
              account_type: 'customer',
              user_id: 'customer-1',
              status: 'active',
              display_name: '扫码客户',
            },
          ],
          rowCount: 1,
        };
      }

      if (text.includes('insert into app.qr_login_sessions')) {
        qrSessions.set(params[0], {
          token: params[0],
          status: 'pending',
          customer_id: null,
          expires_at: new Date(Date.now() + 180000),
        });
        return { rows: [], rowCount: 1 };
      }

      if (text.includes('update app.qr_login_sessions') && text.includes("status = 'confirmed'")) {
        const row = qrSessions.get(params[0]);
        if (!row || row.status !== 'pending') return { rows: [], rowCount: 0 };
        row.status = 'confirmed';
        row.customer_id = params[1];
        return { rows: [row], rowCount: 1 };
      }

      if (text.includes('from app.qr_login_sessions')) {
        const row = qrSessions.get(params[0]);
        return row ? { rows: [row], rowCount: 1 } : { rows: [], rowCount: 0 };
      }

      if (text.includes('insert into app.login_sessions')) {
        return { rows: [{ id: 'web-session-1' }], rowCount: 1 };
      }

      if (text.includes('update app.qr_login_sessions') && text.includes("status = 'cancelled'")) {
        const row = qrSessions.get(params[0]);
        if (row) row.status = 'cancelled';
        return { rows: [], rowCount: row ? 1 : 0 };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
    release() {},
  };

  return {
    queries,
    pool: {
      query: (...args) => client.query(...args),
      connect: async () => client,
    },
  };
}

test('customer QR login requires customer session and exchanges confirmed QR for customer token', async () => {
  const { pool, queries } = createQrPool();
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const createResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/qr/create`, {
      method: 'POST',
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 200);
    assert.ok(created.token);

    const unauthenticated = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/qr/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: created.token }),
    });
    assert.equal(unauthenticated.status, 401);

    const confirmResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/qr/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer customer-token',
      },
      body: JSON.stringify({ token: created.token }),
    });
    const confirmed = await confirmResponse.json();
    assert.equal(confirmResponse.status, 200);
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.customerId, 'customer-1');

    const statusResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/qr/status/${created.token}`);
    const status = await statusResponse.json();
    assert.equal(statusResponse.status, 200);
    assert.equal(status.status, 'confirmed');
    assert.ok(status.customerToken);
    assert.equal(status.customer.id, 'customer-1');

    assert.ok(queries.some((query) => query.sql.includes("status = 'confirmed'") && query.params[1] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.login_sessions') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes("status = 'cancelled'")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
