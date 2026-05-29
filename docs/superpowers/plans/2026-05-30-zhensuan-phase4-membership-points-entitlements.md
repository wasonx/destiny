# Zhensuan Phase 4 Membership Points And Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer value accounting layer: report quota, paid membership, growth level, points balance, entitlement ledger, and quota deduction during report generation.

**Architecture:** PostgreSQL owns all balances and immutable ledger records. Services mutate balances only through ledger-producing functions, so every quota grant, quota spend, point grant, and membership change is auditable. Report generation checks entitlement before model work and records usage after successful report creation.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, Vite, React, TypeScript, native `node:test`, Python unittest.

---

## Scope

This phase implements:

- Membership plan and membership status tables.
- Entitlement account and ledger.
- Points account and ledger.
- Growth level calculation.
- Admin pages for membership, points, and entitlement adjustments.
- Customer APIs for viewing membership, quota, and points.
- Report generation quota check and quota deduction.

This phase does not implement product purchase, order payment, payment callbacks, or coupon marketing.

## File Structure

- Create: `server/db/migrations/004_phase4_membership_entitlements.sql`
- Create: `server/entitlements/ledger-service.mjs`
- Create: `server/entitlements/membership-service.mjs`
- Create: `server/entitlements/growth-service.mjs`
- Create: `server/routes/entitlement-routes.mjs`
- Modify: `server/reports/report-service.mjs`
- Modify: `server/app.mjs`
- Create: `server/tests/entitlements.test.mjs`
- Create: `src/admin/pages/MembershipPage.tsx`
- Create: `src/admin/pages/EntitlementsPage.tsx`
- Create: `src/admin/pages/PointsPage.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Create: `tests/test_phase4_entitlements_scaffold.py`

---

### Task 1: Add Membership And Ledger Schema

**Files:**
- Create: `server/db/migrations/004_phase4_membership_entitlements.sql`
- Test: `server/tests/entitlements.test.mjs`

- [ ] **Step 1: Write migration test**

Create `server/tests/entitlements.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('phase 4 migration defines entitlement and membership tables', async () => {
  const sql = await fs.readFile(new URL('../db/migrations/004_phase4_membership_entitlements.sql', import.meta.url), 'utf8');
  for (const phrase of [
    'create table if not exists app.membership_plans',
    'create table if not exists app.customer_memberships',
    'create table if not exists app.entitlement_accounts',
    'create table if not exists app.entitlement_ledger',
    'create table if not exists app.points_accounts',
    'create table if not exists app.points_ledger',
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Create migration**

Create `server/db/migrations/004_phase4_membership_entitlements.sql`:

```sql
create table if not exists app.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_days integer not null,
  monthly_report_quota integer not null default 0,
  benefits jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id) on delete cascade,
  plan_code text not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists app.entitlement_accounts (
  customer_id uuid primary key references app.users(id) on delete cascade,
  report_quota_balance integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists app.entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id) on delete cascade,
  change_amount integer not null,
  balance_after integer not null,
  reason text not null,
  reference_type text not null default '',
  reference_id text not null default '',
  created_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists app.points_accounts (
  customer_id uuid primary key references app.users(id) on delete cascade,
  points_balance integer not null default 0,
  lifetime_points integer not null default 0,
  growth_level text not null default '启蒙',
  updated_at timestamptz not null default now()
);

create table if not exists app.points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id) on delete cascade,
  change_amount integer not null,
  balance_after integer not null,
  reason text not null,
  reference_type text not null default '',
  reference_id text not null default '',
  created_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Run tests and commit**

```powershell
npm run test:server
git add server/db/migrations/004_phase4_membership_entitlements.sql server/tests/entitlements.test.mjs
git commit -m "feat: add membership entitlement schema"
```

Expected: PASS before commit.

---

### Task 2: Implement Ledger Services

**Files:**
- Create: `server/entitlements/ledger-service.mjs`
- Create: `server/entitlements/growth-service.mjs`
- Test: `server/tests/entitlements.test.mjs`

- [ ] **Step 1: Add service tests**

Append:

```js
import { calculateGrowthLevel } from '../entitlements/growth-service.mjs';

test('growth level is calculated from lifetime points', () => {
  assert.equal(calculateGrowthLevel(0), '启蒙');
  assert.equal(calculateGrowthLevel(100), '入门');
  assert.equal(calculateGrowthLevel(500), '明理');
  assert.equal(calculateGrowthLevel(2000), '通达');
  assert.equal(calculateGrowthLevel(8000), '参玄');
});
```

- [ ] **Step 2: Implement growth service**

Create `server/entitlements/growth-service.mjs`:

```js
export function calculateGrowthLevel(lifetimePoints) {
  if (lifetimePoints >= 8000) return '参玄';
  if (lifetimePoints >= 2000) return '通达';
  if (lifetimePoints >= 500) return '明理';
  if (lifetimePoints >= 100) return '入门';
  return '启蒙';
}
```

- [ ] **Step 3: Implement ledger service**

Create `server/entitlements/ledger-service.mjs`:

```js
import { calculateGrowthLevel } from './growth-service.mjs';

export async function grantReportQuota(client, { customerId, amount, reason, referenceType = '', referenceId = '', actorUserId = null }) {
  await client.query(
    `insert into app.entitlement_accounts(customer_id, report_quota_balance)
     values ($1, 0)
     on conflict (customer_id) do nothing`,
    [customerId],
  );
  const account = await client.query(
    `update app.entitlement_accounts
     set report_quota_balance = report_quota_balance + $2, updated_at = now()
     where customer_id = $1
     returning report_quota_balance`,
    [customerId, amount],
  );
  const balance = account.rows[0].report_quota_balance;
  await client.query(
    `insert into app.entitlement_ledger(customer_id, change_amount, balance_after, reason, reference_type, reference_id, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [customerId, amount, balance, reason, referenceType, referenceId, actorUserId],
  );
  return balance;
}

export async function spendReportQuota(client, { customerId, amount = 1, reason, referenceType = '', referenceId = '' }) {
  const account = await client.query(
    `update app.entitlement_accounts
     set report_quota_balance = report_quota_balance - $2, updated_at = now()
     where customer_id = $1 and report_quota_balance >= $2
     returning report_quota_balance`,
    [customerId, amount],
  );
  if (!account.rowCount) throw new Error('INSUFFICIENT_REPORT_QUOTA');
  const balance = account.rows[0].report_quota_balance;
  await client.query(
    `insert into app.entitlement_ledger(customer_id, change_amount, balance_after, reason, reference_type, reference_id)
     values ($1, $2, $3, $4, $5, $6)`,
    [customerId, -amount, balance, reason, referenceType, referenceId],
  );
  return balance;
}

export async function grantPoints(client, { customerId, amount, reason, referenceType = '', referenceId = '', actorUserId = null }) {
  await client.query(
    `insert into app.points_accounts(customer_id, points_balance, lifetime_points)
     values ($1, 0, 0)
     on conflict (customer_id) do nothing`,
    [customerId],
  );
  const account = await client.query(
    `update app.points_accounts
     set points_balance = points_balance + $2,
         lifetime_points = lifetime_points + greatest($2, 0),
         growth_level = $3,
         updated_at = now()
     where customer_id = $1
     returning points_balance, lifetime_points`,
    [customerId, amount, calculateGrowthLevel(amount)],
  );
  const row = account.rows[0];
  const level = calculateGrowthLevel(row.lifetime_points);
  await client.query('update app.points_accounts set growth_level = $2 where customer_id = $1', [customerId, level]);
  await client.query(
    `insert into app.points_ledger(customer_id, change_amount, balance_after, reason, reference_type, reference_id, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [customerId, amount, row.points_balance, reason, referenceType, referenceId, actorUserId],
  );
  return { balance: row.points_balance, growthLevel: level };
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:server
git add server/entitlements server/tests/entitlements.test.mjs
git commit -m "feat: add entitlement ledger services"
```

Expected: PASS before commit.

---

### Task 3: Add Entitlement APIs

**Files:**
- Create: `server/routes/entitlement-routes.mjs`
- Create: `server/entitlements/membership-service.mjs`
- Modify: `server/app.mjs`

- [ ] **Step 1: Implement membership service**

Create `server/entitlements/membership-service.mjs`:

```js
export async function getCustomerValueState(pool, customerId) {
  const [membership, entitlement, points] = await Promise.all([
    pool.query(
      `select plan_code, starts_at, expires_at, status
       from app.customer_memberships
       where customer_id = $1 and status = 'active' and expires_at > now()
       order by expires_at desc
       limit 1`,
      [customerId],
    ),
    pool.query('select report_quota_balance from app.entitlement_accounts where customer_id = $1', [customerId]),
    pool.query('select points_balance, lifetime_points, growth_level from app.points_accounts where customer_id = $1', [customerId]),
  ]);

  return {
    membership: membership.rows[0] || null,
    reportQuotaBalance: entitlement.rows[0]?.report_quota_balance || 0,
    points: points.rows[0] || { points_balance: 0, lifetime_points: 0, growth_level: '启蒙' },
  };
}
```

- [ ] **Step 2: Create route module**

Create endpoints:

```text
GET  /destiny-api/customer/value-state
GET  /destiny-api/admin/customers/:customerId/value-state
POST /destiny-api/admin/customers/:customerId/grant-quota
POST /destiny-api/admin/customers/:customerId/grant-points
POST /destiny-api/admin/customers/:customerId/grant-membership
```

Constraints:

- Customer route requires customer session.
- Admin routes require admin session.
- Manual grants write ledger rows and audit logs.

- [ ] **Step 3: Mount routes**

Modify `server/app.mjs` to mount entitlement routes when the PostgreSQL pool exists.

- [ ] **Step 4: Run checks and commit**

```powershell
npm run test:server
git add server/routes/entitlement-routes.mjs server/entitlements/membership-service.mjs server/app.mjs
git commit -m "feat: add entitlement api"
```

Expected: PASS before commit.

---

### Task 4: Deduct Report Quota During Generation

**Files:**
- Modify: `server/reports/report-service.mjs`
- Modify: `server/routes/report-routes.mjs`
- Test: `server/tests/entitlements.test.mjs`

- [ ] **Step 1: Add behavior rule**

Report generation with a customer session must:

1. Check `report_quota_balance >= 1`.
2. Generate and safety-review report.
3. Save report run.
4. Deduct one report quota with `reference_type = 'report_run'`.

If model generation fails and fallback report is returned, quota is deducted only when the report is successfully returned to the customer.

- [ ] **Step 2: Add insufficient quota response**

When quota is insufficient, return:

```json
{
  "error": "INSUFFICIENT_REPORT_QUOTA",
  "message": "报告次数不足"
}
```

HTTP status: `402`.

- [ ] **Step 3: Run checks and commit**

```powershell
npm run test:server
git add server/reports/report-service.mjs server/routes/report-routes.mjs server/tests/entitlements.test.mjs
git commit -m "feat: enforce report quota"
```

Expected: PASS before commit.

---

### Task 5: Add Admin Value Accounting UI

**Files:**
- Create: `src/admin/pages/MembershipPage.tsx`
- Create: `src/admin/pages/EntitlementsPage.tsx`
- Create: `src/admin/pages/PointsPage.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Test: `tests/test_phase4_entitlements_scaffold.py`

- [ ] **Step 1: Add scaffold test**

Create `tests/test_phase4_entitlements_scaffold.py`:

```python
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Phase4EntitlementsScaffoldTests(unittest.TestCase):
    def test_value_accounting_pages_exist(self):
        for relative in [
            "src/admin/pages/MembershipPage.tsx",
            "src/admin/pages/EntitlementsPage.tsx",
            "src/admin/pages/PointsPage.tsx",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_navigation_contains_value_accounting(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        for label in ["会员管理", "权益账户", "积分账户"]:
            self.assertIn(label, layout)
```

- [ ] **Step 2: Build pages**

Create:

- `MembershipPage.tsx`: plan list, active memberships, manual grant form.
- `EntitlementsPage.tsx`: report quota balance, grant/spend ledger.
- `PointsPage.tsx`: points balance, lifetime points, growth level, ledger.

- [ ] **Step 3: Run checks and commit**

```powershell
python -m unittest tests.test_phase4_entitlements_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase4_entitlements_scaffold.py
git commit -m "feat: add value accounting admin"
```

Expected: all checks PASS before commit.

---

## Acceptance Criteria

- Every customer can have one entitlement account and one points account.
- Admin grants write ledger rows.
- Report generation refuses insufficient quota.
- Successful customer report generation deducts one quota.
- Growth level updates from lifetime points.
- Customer can view membership, quota, points, and growth level.
