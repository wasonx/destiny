import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildEntitlementPayload } from '../commerce/product-mapping-service.mjs';
import { assertPaymentTransition } from '../commerce/payment-state-machine.mjs';

test('commerce schema migration exists', () => {
  const sql = readFileSync(new URL('../db/migrations/005_phase5_commerce_payment.sql', import.meta.url), 'utf8');

  assert.match(sql, /app\.commerce_products/);
  assert.match(sql, /app\.commerce_inventory/);
  assert.match(sql, /app\.customer_addresses/);
  assert.match(sql, /app\.commerce_orders/);
  assert.match(sql, /app\.payment_intents/);
  assert.match(sql, /app\.entitlement_deliveries/);
  assert.match(sql, /app\.shipments/);
  assert.match(sql, /app\.refund_requests/);
});

test('payment state machine allows only expected transitions', () => {
  assert.equal(assertPaymentTransition('created', 'pending'), true);
  assert.equal(assertPaymentTransition('pending', 'paid'), true);
  assert.throws(() => assertPaymentTransition('paid', 'pending'), /INVALID_PAYMENT_TRANSITION/);
  assert.throws(() => assertPaymentTransition('cancelled', 'paid'), /INVALID_PAYMENT_TRANSITION/);
});

test('product mapping separates virtual entitlements from physical inventory', () => {
  assert.deepEqual(buildEntitlementPayload({ product_type: 'report_quota', entitlement_payload: { amount: 3 } }), {
    kind: 'reportQuota',
    amount: 3,
  });
  assert.deepEqual(buildEntitlementPayload({ product_type: 'physical_goods', sku: 'LPS-001' }), {
    kind: 'physicalGoods',
    requiresShipping: true,
    inventorySku: 'LPS-001',
  });
});
