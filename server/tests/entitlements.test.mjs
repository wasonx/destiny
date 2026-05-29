import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculateGrowthLevel } from '../entitlements/growth-service.mjs';

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
