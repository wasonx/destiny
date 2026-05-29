import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function publishedContentRows(sql) {
  if (sql.includes('from app.knowledge_entries')) {
    return { rows: [] };
  }
  if (sql.includes('from app.analysis_rules')) {
    return { rows: [] };
  }
  if (sql.includes('from app.report_templates')) {
    return { rows: [] };
  }
  return null;
}

test('health route returns configured model state', async () => {
  const app = createApp({ config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'deepseek-chat' }) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      model: 'deepseek-chat',
      hasKey: false,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin route modules are mounted', async () => {
  const app = createApp({ config: loadConfig({}) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/ops/health`);
    assert.notEqual(response.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route fills missing ai report fields from fallback structure', async () => {
  const aiServer = await new Promise((resolve) => {
    const server = createApp({
      config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'mock' }),
    }).listen(0, () => resolve(server));
  });
  const aiPort = aiServer.address().port;
  aiServer.removeAllListeners('request');
  aiServer.on('request', (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'AI 摘要' }) } }] }));
  });

  const app = createApp({
    config: loadConfig({
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'mock',
      DEEPSEEK_API_URL: `http://127.0.0.1:${aiPort}`,
    }),
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'space', payload: { focus: '房屋朝向' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.title, '安居 · 环境分析');
    assert.equal(data.report.summary, 'AI 摘要');
    assert.ok(Array.isArray(data.report.sections));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => aiServer.close(resolve));
  }
});

test('generate route with customer session spends report quota and records customer report run', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('update app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 2 }], rowCount: 1 };
      }
      if (sql.includes('insert into app.entitlement_ledger')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_runs')) {
        return { rows: [{ id: 'report-run-1' }], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', payload: { focus: '事业' } }),
    });
    assert.equal(response.status, 200);
    assert.ok(queries.some((query) => query.sql.includes('update app.entitlement_accounts') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.report_runs') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.safety_reviews')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route returns 402 when logged-in customer has no report quota', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('update app.entitlement_accounts')) {
        return { rows: [], rowCount: 0 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', payload: { focus: '事业' } }),
    });
    assert.equal(response.status, 402);
    assert.deepEqual(await response.json(), { error: 'INSUFFICIENT_REPORT_QUOTA' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('customer value state route reads the logged-in customer', async () => {
  const seenParams = [];
  const pool = {
    async query(sql, params = []) {
      seenParams.push(params);
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      if (sql.includes('from app.customer_memberships')) {
        return { rows: [] };
      }
      if (sql.includes('from app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 7 }] };
      }
      if (sql.includes('from app.points_accounts')) {
        return { rows: [{ points_balance: 9, lifetime_points: 12, growth_level: '启蒙' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/value-state`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.reportQuotaBalance, 7);
    assert.ok(seenParams.some((params) => params[0] === 'customer-1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
