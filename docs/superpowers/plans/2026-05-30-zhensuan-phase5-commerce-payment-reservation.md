# Zhensuan Phase 5 Commerce And Payment Reservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight virtual-goods commerce layer with MedusaJS integration boundaries, local order/payment reservation, manual paid testing, and automatic entitlement delivery after payment success.

**Architecture:** MedusaJS remains the commerce catalog and order base, while 甄算 keeps a local payment/order mirror for entitlement delivery and audit. WeChat Pay is represented by a provider interface and payment state machine, with real API credentials and callbacks disabled until production payment onboarding is complete.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, MedusaJS, Vite, React, TypeScript, native `node:test`, Python unittest.

---

## Scope

This phase implements:

- Product mapping for report quota package, monthly membership, yearly membership, and digital content.
- Local order and payment intent tables.
- Payment provider interface with manual provider and WeChat placeholder provider.
- Manual mark-paid admin flow.
- Entitlement delivery after payment success.
- Admin commerce pages for products, orders, payments, and delivery logs.

This phase does not implement real WeChat Pay signing, real payment callbacks, refunds, coupons, logistics, or physical goods.

## File Structure

- Create: `server/db/migrations/005_phase5_commerce_payment.sql`
- Create: `server/commerce/product-mapping-service.mjs`
- Create: `server/commerce/order-service.mjs`
- Create: `server/commerce/payment-state-machine.mjs`
- Create: `server/commerce/payment-providers/manual-provider.mjs`
- Create: `server/commerce/payment-providers/wechat-placeholder-provider.mjs`
- Create: `server/commerce/delivery-service.mjs`
- Create: `server/routes/commerce-routes.mjs`
- Modify: `server/app.mjs`
- Create: `server/tests/commerce.test.mjs`
- Create: `src/admin/pages/ProductsPage.tsx`
- Create: `src/admin/pages/OrdersPage.tsx`
- Create: `src/admin/pages/PaymentsPage.tsx`
- Create: `src/admin/pages/DeliveryLogsPage.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Create: `tests/test_phase5_commerce_scaffold.py`

---

### Task 1: Add Commerce And Payment Schema

**Files:**
- Create: `server/db/migrations/005_phase5_commerce_payment.sql`
- Test: `server/tests/commerce.test.mjs`

- [ ] **Step 1: Write migration test**

Create `server/tests/commerce.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('phase 5 migration defines commerce payment tables', async () => {
  const sql = await fs.readFile(new URL('../db/migrations/005_phase5_commerce_payment.sql', import.meta.url), 'utf8');
  for (const phrase of [
    'create table if not exists app.commerce_products',
    'create table if not exists app.commerce_orders',
    'create table if not exists app.payment_intents',
    'create table if not exists app.entitlement_deliveries',
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Create migration**

Create `server/db/migrations/005_phase5_commerce_payment.sql`:

```sql
create table if not exists app.commerce_products (
  id uuid primary key default gen_random_uuid(),
  medusa_product_id text not null default '',
  sku text not null unique,
  name text not null,
  product_type text not null check (product_type in ('report_quota', 'monthly_membership', 'yearly_membership', 'digital_content')),
  price_cents integer not null,
  currency text not null default 'CNY',
  entitlement_payload jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id) on delete cascade,
  medusa_order_id text not null default '',
  order_no text not null unique,
  status text not null default 'created' check (status in ('created', 'pending_payment', 'paid', 'cancelled', 'closed')),
  total_cents integer not null,
  currency text not null default 'CNY',
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id) on delete cascade,
  provider text not null check (provider in ('manual', 'wechat_placeholder')),
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'cancelled')),
  amount_cents integer not null,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.entitlement_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id) on delete cascade,
  customer_id uuid not null references app.users(id) on delete cascade,
  product_sku text not null,
  delivery_type text not null,
  delivery_payload jsonb not null,
  status text not null default 'delivered' check (status in ('delivered', 'failed')),
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Run tests and commit**

```powershell
npm run test:server
git add server/db/migrations/005_phase5_commerce_payment.sql server/tests/commerce.test.mjs
git commit -m "feat: add commerce payment schema"
```

Expected: PASS before commit.

---

### Task 2: Implement Product Mapping And Payment State Machine

**Files:**
- Create: `server/commerce/product-mapping-service.mjs`
- Create: `server/commerce/payment-state-machine.mjs`
- Test: `server/tests/commerce.test.mjs`

- [ ] **Step 1: Add state machine tests**

Append:

```js
import { canTransitionPayment } from '../commerce/payment-state-machine.mjs';

test('payment state machine allows created to pending to paid', () => {
  assert.equal(canTransitionPayment('created', 'pending'), true);
  assert.equal(canTransitionPayment('pending', 'paid'), true);
  assert.equal(canTransitionPayment('paid', 'pending'), false);
});
```

- [ ] **Step 2: Implement state machine**

Create `server/commerce/payment-state-machine.mjs`:

```js
const transitions = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'failed', 'cancelled'],
  paid: [],
  failed: ['pending', 'cancelled'],
  cancelled: [],
};

export function canTransitionPayment(from, to) {
  return transitions[from]?.includes(to) || false;
}
```

- [ ] **Step 3: Implement product mapping service**

Create `server/commerce/product-mapping-service.mjs`:

```js
export function buildEntitlementPayload(product) {
  if (product.product_type === 'report_quota') {
    return { reportQuota: Number(product.entitlement_payload.reportQuota || 0) };
  }
  if (product.product_type === 'monthly_membership') {
    return { membershipPlan: 'monthly', durationDays: 31 };
  }
  if (product.product_type === 'yearly_membership') {
    return { membershipPlan: 'yearly', durationDays: 365 };
  }
  if (product.product_type === 'digital_content') {
    return { digitalContentSku: product.sku };
  }
  return {};
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:server
git add server/commerce/product-mapping-service.mjs server/commerce/payment-state-machine.mjs server/tests/commerce.test.mjs
git commit -m "feat: add commerce state helpers"
```

Expected: PASS before commit.

---

### Task 3: Implement Orders, Payment Providers, And Delivery

**Files:**
- Create: `server/commerce/order-service.mjs`
- Create: `server/commerce/payment-providers/manual-provider.mjs`
- Create: `server/commerce/payment-providers/wechat-placeholder-provider.mjs`
- Create: `server/commerce/delivery-service.mjs`

- [ ] **Step 1: Implement manual payment provider**

Create `server/commerce/payment-providers/manual-provider.mjs`:

```js
export function createManualPaymentIntent({ orderId, amountCents }) {
  return {
    provider: 'manual',
    status: 'pending',
    providerPayload: {
      orderId,
      amountCents,
      instruction: '人工确认收款后标记为已支付',
    },
  };
}
```

- [ ] **Step 2: Implement WeChat placeholder provider**

Create `server/commerce/payment-providers/wechat-placeholder-provider.mjs`:

```js
export function createWechatPlaceholderIntent({ orderId, amountCents }) {
  return {
    provider: 'wechat_placeholder',
    status: 'created',
    providerPayload: {
      orderId,
      amountCents,
      disabledReason: '微信支付真实接口尚未接入',
    },
  };
}
```

- [ ] **Step 3: Implement delivery service**

Create `server/commerce/delivery-service.mjs`:

```js
import { grantReportQuota, grantPoints } from '../entitlements/ledger-service.mjs';

export async function deliverOrderEntitlements(client, { order, products }) {
  for (const product of products) {
    const payload = product.entitlement_payload || {};
    if (product.product_type === 'report_quota') {
      await grantReportQuota(client, {
        customerId: order.customer_id,
        amount: Number(payload.reportQuota || 0),
        reason: 'order_paid',
        referenceType: 'commerce_order',
        referenceId: order.id,
      });
    }
    if (product.product_type.includes('membership')) {
      await client.query(
        `insert into app.customer_memberships(customer_id, plan_code, starts_at, expires_at, source)
         values ($1, $2, now(), now() + ($3 || ' days')::interval, 'order')`,
        [order.customer_id, product.product_type, Number(payload.durationDays || 31)],
      );
    }
    await grantPoints(client, {
      customerId: order.customer_id,
      amount: Math.floor(product.price_cents / 100),
      reason: 'order_paid',
      referenceType: 'commerce_order',
      referenceId: order.id,
    });
  }
}
```

- [ ] **Step 4: Implement order service**

Create `server/commerce/order-service.mjs` with functions:

```text
createOrder(client, { customerId, items })
createPaymentIntent(client, { orderId, provider })
markPaymentPaid(client, { paymentIntentId, actorUserId })
```

`markPaymentPaid` must update payment status, update order status, call `deliverOrderEntitlements`, and write audit logs in one transaction.

- [ ] **Step 5: Run tests and commit**

```powershell
npm run test:server
git add server/commerce
git commit -m "feat: add commerce order delivery services"
```

Expected: PASS before commit.

---

### Task 4: Add Commerce APIs

**Files:**
- Create: `server/routes/commerce-routes.mjs`
- Modify: `server/app.mjs`

- [ ] **Step 1: Create customer commerce endpoints**

Create:

```text
GET  /destiny-api/customer/products
POST /destiny-api/customer/orders
GET  /destiny-api/customer/orders
GET  /destiny-api/customer/orders/:id
```

Rules:

- Only active virtual products are returned.
- Customer orders can only be read by the current customer.

- [ ] **Step 2: Create admin commerce endpoints**

Create:

```text
GET   /destiny-api/admin/products
POST  /destiny-api/admin/products
PATCH /destiny-api/admin/products/:id
GET   /destiny-api/admin/orders
GET   /destiny-api/admin/payments
POST  /destiny-api/admin/payments/:id/mark-paid
GET   /destiny-api/admin/delivery-logs
```

Rules:

- Mark-paid requires admin role.
- Mark-paid is disabled for payment intents already paid or cancelled.

- [ ] **Step 3: Mount routes and verify**

```powershell
npm run test:server
git add server/routes/commerce-routes.mjs server/app.mjs
git commit -m "feat: add commerce api"
```

Expected: PASS before commit.

---

### Task 5: Add Commerce Admin UI

**Files:**
- Create: `src/admin/pages/ProductsPage.tsx`
- Create: `src/admin/pages/OrdersPage.tsx`
- Create: `src/admin/pages/PaymentsPage.tsx`
- Create: `src/admin/pages/DeliveryLogsPage.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Test: `tests/test_phase5_commerce_scaffold.py`

- [ ] **Step 1: Add scaffold test**

Create `tests/test_phase5_commerce_scaffold.py`:

```python
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Phase5CommerceScaffoldTests(unittest.TestCase):
    def test_commerce_pages_exist(self):
        for relative in [
            "src/admin/pages/ProductsPage.tsx",
            "src/admin/pages/OrdersPage.tsx",
            "src/admin/pages/PaymentsPage.tsx",
            "src/admin/pages/DeliveryLogsPage.tsx",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_navigation_contains_commerce_sections(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        for label in ["商品管理", "订单管理", "支付管理", "发放记录"]:
            self.assertIn(label, layout)
```

- [ ] **Step 2: Build pages**

Create:

- `ProductsPage.tsx`: product list, SKU, price, product type, entitlement payload.
- `OrdersPage.tsx`: order list, customer, amount, status, item details.
- `PaymentsPage.tsx`: payment intent list and mark-paid action.
- `DeliveryLogsPage.tsx`: delivered product, entitlement payload, status, created time.

- [ ] **Step 3: Run checks and commit**

```powershell
python -m unittest tests.test_phase5_commerce_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase5_commerce_scaffold.py
git commit -m "feat: add commerce admin pages"
```

Expected: all checks PASS before commit.

---

## Acceptance Criteria

- Admin can define virtual products and entitlement payloads.
- Customer can create an order for active products.
- Manual payment success changes payment and order status to paid.
- Paid orders trigger entitlement delivery exactly once.
- WeChat Pay is represented as a disabled placeholder provider with explicit disabled reason.
- No physical goods, logistics, or real payment secrets are introduced.
