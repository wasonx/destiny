import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('customer report history requires session and filters reports by customer', async () => {
  const queries = [];
  const pool = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      if (text.includes('from app.report_runs') && text.includes('order by created_at desc')) {
        return {
          rows: [
            { id: 'report-1', customer_id: 'customer-1', report_kind: 'life', report_tier: 'free' },
          ],
        };
      }
      if (text.includes('from app.report_runs') && text.includes('id = $1') && text.includes('customer_id = $2')) {
        return { rows: [{ id: params[0], customer_id: params[1], report_kind: 'life', report_tier: 'full' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const unauthenticated = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/report-runs`);
    assert.equal(unauthenticated.status, 401);

    const listResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/report-runs`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const listData = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listData.reportRuns[0].customer_id, 'customer-1');

    const detailResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/report-runs/report-1`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const detailData = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    assert.equal(detailData.reportRun.id, 'report-1');

    assert.ok(queries.some((query) => query.sql.includes('from app.report_runs') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('id = $1') && query.params[0] === 'report-1' && query.params[1] === 'customer-1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
