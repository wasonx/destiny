import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculateGrowthLevel } from '../entitlements/growth-service.mjs';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

test('entitlement schema migration exists', () => {
  const sql = readFileSync(new URL('../db/migrations/004_phase4_membership_entitlements.sql', import.meta.url), 'utf8');

  assert.match(sql, /app\.membership_plans/);
  assert.match(sql, /app\.customer_memberships/);
  assert.match(sql, /app\.entitlement_accounts/);
  assert.match(sql, /app\.entitlement_ledger/);
  assert.match(sql, /app\.points_accounts/);
  assert.match(sql, /app\.points_ledger/);
});

test('growth levels are calculated from lifetime points', () => {
  assert.equal(calculateGrowthLevel(0), '启蒙');
  assert.equal(calculateGrowthLevel(100), '入门');
  assert.equal(calculateGrowthLevel(500), '明理');
  assert.equal(calculateGrowthLevel(2000), '通达');
  assert.equal(calculateGrowthLevel(8000), '参玄');
});

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('admin entitlement grant routes require platform admin and write audit logs', async () => {
  const queries = [];
  let sessionRole = 'editor';
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }
      if (text.startsWith('insert into app.entitlement_accounts')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('update app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 8 }], rowCount: 1 };
      }
      if (text.startsWith('insert into app.entitlement_ledger')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('insert into app.points_accounts')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('select points_balance')) {
        return { rows: [{ points_balance: 10, lifetime_points: 90 }] };
      }
      if (text.startsWith('update app.points_accounts')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('insert into app.points_ledger')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('insert into app.customer_memberships')) {
        return { rows: [{ id: 'membership-1', plan_code: params[1] }], rowCount: 1 };
      }
      if (text.startsWith('insert into app.audit_logs')) {
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
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const editorResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/customers/customer-1/grant-quota`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2 }),
    });
    assert.equal(editorResponse.status, 403);

    sessionRole = 'admin';
    for (const [path, body] of [
      ['/destiny-api/admin/customers/customer-1/grant-quota', { amount: 2, reason: '运营补发' }],
      ['/destiny-api/admin/customers/customer-1/grant-points', { amount: 20, reason: '活动奖励' }],
      ['/destiny-api/admin/customers/customer-1/grant-membership', { planCode: 'monthly', durationDays: 31 }],
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200, path);
    }

    const auditActions = queries
      .filter((query) => query.sql.startsWith('insert into app.audit_logs'))
      .map((query) => query.params[1]);
    assert.deepEqual(auditActions, ['entitlement.grant_quota', 'points.grant', 'membership.grant']);
    assert.ok(queries.some((query) => query.sql.startsWith('insert into app.entitlement_ledger') && query.params.includes('admin-1')));
    assert.ok(queries.some((query) => query.sql.startsWith('insert into app.points_ledger') && query.params.includes('admin-1')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
