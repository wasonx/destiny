import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import * as orderService from '../commerce/order-service.mjs';
import { createOrder, createPaymentIntent, markOrderShipped, markPaymentPaid } from '../commerce/order-service.mjs';
import { buildEntitlementPayload } from '../commerce/product-mapping-service.mjs';
import { assertPaymentTransition } from '../commerce/payment-state-machine.mjs';
import { createRefundRequest, reviewRefundRequest } from '../commerce/refund-service.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function createCommerceClient({ cardInventory = 2 } = {}) {
  const state = {
    products: [
      {
        id: 'product-report',
        sku: 'REPORT-3',
        name: '报告次数包 3 次',
        product_type: 'report_quota',
        price_cents: 990,
        currency: 'CNY',
        entitlement_payload: { amount: 3 },
        requires_shipping: false,
        status: 'active',
      },
      {
        id: 'product-card',
        sku: 'CARD-001',
        name: '甄好算罗盘卡',
        product_type: 'physical_goods',
        price_cents: 3900,
        currency: 'CNY',
        entitlement_payload: {},
        requires_shipping: true,
        status: 'active',
      },
    ],
    inventory: { 'CARD-001': cardInventory },
    orders: [],
    payments: [],
    refunds: [],
    shipments: [],
    entitlementDeliveries: [],
    quotaBalance: 0,
    pointsBalance: 0,
    lifetimePoints: 0,
    auditLogs: [],
  };

  const client = {
    state,
    async query(sql, params = []) {
      const text = normalizeSql(sql);

      if (text.includes('from app.commerce_products') && text.includes('sku = any')) {
        return { rows: state.products.filter((product) => params[0].includes(product.sku) && product.status === 'active') };
      }

      if (text.startsWith('insert into app.commerce_orders')) {
        assert.equal(typeof params[5], 'string');
        const order = {
          id: `order-${state.orders.length + 1}`,
          customer_id: params[0],
          order_no: params[1],
          status: 'pending_payment',
          amount_cents: params[2],
          freight_cents: params[3],
          address_snapshot: params[4],
          items: JSON.parse(params[5]),
        };
        state.orders.push(order);
        return { rows: [order], rowCount: 1 };
      }

      if (text.startsWith('insert into app.payment_intents')) {
        const payment = {
          id: `payment-${state.payments.length + 1}`,
          order_id: params[0],
          provider: params[1],
          status: params[2],
          amount_cents: params[3],
          provider_payload: params[4],
        };
        state.payments.push(payment);
        return { rows: [payment], rowCount: 1 };
      }

      if (text.startsWith('insert into app.refund_requests')) {
        const refund = {
          id: `refund-${state.refunds.length + 1}`,
          order_id: params[0],
          customer_id: params[1],
          reason: params[2],
          amount_cents: params[3],
          status: 'requested',
        };
        state.refunds.push(refund);
        return { rows: [refund], rowCount: 1 };
      }

      if (text.startsWith('insert into app.shipments')) {
        const shipment = {
          id: `shipment-${state.shipments.length + 1}`,
          order_id: params[0],
          carrier: params[1],
          tracking_no: params[2],
          created_by: params[3],
        };
        state.shipments.push(shipment);
        return { rows: [shipment], rowCount: 1 };
      }

      if (text.includes('select * from app.refund_requests') && text.includes('for update')) {
        return { rows: state.refunds.filter((refund) => refund.id === params[0]) };
      }

      if (text.startsWith('update app.refund_requests')) {
        const refund = state.refunds.find((item) => item.id === params[0]);
        refund.status = params[1];
        refund.reviewer_id = params[2];
        refund.review_note = params[3];
        return { rows: [refund], rowCount: 1 };
      }

      if (text.includes('select * from app.payment_intents') && text.includes('for update')) {
        return { rows: state.payments.filter((payment) => payment.id === params[0]) };
      }

      if (text.includes('select * from app.commerce_orders') && text.includes('for update')) {
        return { rows: state.orders.filter((order) => order.id === params[0]) };
      }

      if (text.startsWith('update app.payment_intents')) {
        if (text.includes('where order_id = $1')) {
          const rows = state.payments.filter((item) => item.order_id === params[0] && ['created', 'pending'].includes(item.status));
          rows.forEach((payment) => { payment.status = 'cancelled'; });
          return { rows, rowCount: rows.length };
        }
        const payment = state.payments.find((item) => item.id === params[0]);
        payment.status = 'paid';
        return { rows: [payment], rowCount: 1 };
      }

      if (text.startsWith('update app.commerce_orders')) {
        const order = state.orders.find((item) => item.id === params[0]);
        order.status = params[1] || (text.includes("status = 'shipped'") ? 'shipped' : 'paid');
        return { rows: [order], rowCount: 1 };
      }

      if (text.startsWith('update app.commerce_inventory')) {
        const sku = params[0];
        const quantity = Number(params[1]);
        if (Number(state.inventory[sku] || 0) < quantity) {
          return { rows: [], rowCount: 0 };
        }
        state.inventory[sku] -= quantity;
        return { rows: [{ quantity: state.inventory[sku] }], rowCount: 1 };
      }

      if (text.startsWith('insert into app.entitlement_accounts')) {
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('update app.entitlement_accounts')) {
        state.quotaBalance += Number(params[1]);
        return { rows: [{ report_quota_balance: state.quotaBalance }], rowCount: 1 };
      }

      if (text.startsWith('insert into app.entitlement_ledger')) {
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('insert into app.points_accounts')) {
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('select points_balance')) {
        return { rows: [{ points_balance: state.pointsBalance, lifetime_points: state.lifetimePoints }] };
      }

      if (text.startsWith('update app.points_accounts')) {
        state.pointsBalance = Number(params[1]);
        state.lifetimePoints = Number(params[2]);
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('insert into app.points_ledger')) {
        return { rows: [], rowCount: 1 };
      }

      if (text.startsWith('insert into app.entitlement_deliveries')) {
        const delivery = {
          order_id: params[0],
          item_sku: params[1],
          delivery_type: params[2],
          status: params[3],
          payload: params[4],
        };
        const exists = state.entitlementDeliveries.some(
          (item) => item.order_id === delivery.order_id && item.item_sku === delivery.item_sku && item.delivery_type === delivery.delivery_type,
        );
        if (!exists) state.entitlementDeliveries.push(delivery);
        return { rows: [delivery], rowCount: exists ? 0 : 1 };
      }

      if (text.startsWith('insert into app.audit_logs')) {
        state.auditLogs.push({ actor_user_id: params[0], action: params[1], target_type: params[2], target_id: params[3], metadata: params[4] || {} });
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };

  return client;
}

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

test('commerce seed migration provisions default plans, products and inventory', () => {
  const sql = readFileSync(new URL('../db/migrations/006_phase5_commerce_seed.sql', import.meta.url), 'utf8');

  assert.match(sql, /app\.membership_plans/);
  assert.match(sql, /REPORT-3/);
  assert.match(sql, /CARD-001/);
  assert.match(sql, /app\.commerce_inventory/);
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

test('paid mixed commerce order deducts inventory, grants virtual entitlement, and records delivery', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [
      { sku: 'REPORT-3', quantity: 1 },
      { sku: 'CARD-001', quantity: 2 },
    ],
    address: { receiver_name: '王先生', phone: '13800000000', detail_address: '测试地址' },
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents + order.freight_cents,
    provider: 'manual',
  });

  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });

  assert.equal(client.state.orders[0].status, 'pending_fulfillment');
  assert.equal(client.state.inventory['CARD-001'], 0);
  assert.equal(client.state.quotaBalance, 3);
  assert.equal(client.state.pointsBalance, 87);
  assert.deepEqual(
    client.state.entitlementDeliveries.map((item) => `${item.item_sku}:${item.delivery_type}`),
    ['REPORT-3:reportQuota', 'CARD-001:physicalFulfillment', 'ORDER:points'],
  );
});

test('insufficient physical inventory blocks paid transition before virtual entitlement delivery', async () => {
  const client = createCommerceClient({ cardInventory: 1 });
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [
      { sku: 'REPORT-3', quantity: 1 },
      { sku: 'CARD-001', quantity: 2 },
    ],
    address: { receiver_name: '王先生', phone: '13800000000', detail_address: '测试地址' },
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents + order.freight_cents,
    provider: 'manual',
  });

  await assert.rejects(
    () => markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' }),
    /INSUFFICIENT_INVENTORY/,
  );

  assert.equal(client.state.orders[0].status, 'pending_payment');
  assert.equal(client.state.inventory['CARD-001'], 1);
  assert.equal(client.state.quotaBalance, 0);
  assert.equal(client.state.entitlementDeliveries.length, 0);
});

test('refund request is rejected before payment is confirmed', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });

  await assert.rejects(
    () => createRefundRequest(client, {
      orderId: order.id,
      customerId: 'customer-1',
      reason: '未支付订单退款',
      amountCents: order.amount_cents,
    }),
    /INVALID_REFUND_ORDER_STATUS/,
  );
  assert.equal(client.state.refunds.length, 0);
});

test('approved refund review marks the order refunded', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents,
    provider: 'manual',
  });
  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });
  const refund = await createRefundRequest(client, {
    orderId: order.id,
    customerId: 'customer-1',
    reason: '已支付订单退款',
    amountCents: order.amount_cents,
  });

  await reviewRefundRequest(client, {
    refundRequestId: refund.id,
    status: 'approved',
    reviewerId: 'admin-1',
    note: '人工审核通过',
  });

  assert.equal(client.state.refunds[0].status, 'approved');
  assert.equal(client.state.orders[0].status, 'refunded');
});

test('pending payment orders can be closed with audit log', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });
  await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents,
    provider: 'manual',
  });

  const closed = await orderService.closeOrder(client, {
    orderId: order.id,
    actorUserId: 'admin-1',
    reason: '客户取消支付',
  });

  assert.equal(closed.status, 'closed');
  assert.equal(client.state.payments[0].status, 'cancelled');
  const audit = client.state.auditLogs.at(-1);
  assert.equal(audit.action, 'order.close');
  assert.equal(audit.target_type, 'commerce_order');
  assert.equal(audit.target_id, order.id);
  assert.equal(audit.metadata.reason, '客户取消支付');
});

test('paid orders cannot be closed directly', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents,
    provider: 'manual',
  });
  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });

  await assert.rejects(
    () => orderService.closeOrder(client, {
      orderId: order.id,
      actorUserId: 'admin-1',
      reason: '误关已支付订单',
    }),
    /INVALID_ORDER_STATUS/,
  );
  assert.equal(client.state.orders[0].status, 'paid');
});

test('refund review writes audit log with status and note', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents,
    provider: 'manual',
  });
  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });
  const refund = await createRefundRequest(client, {
    orderId: order.id,
    customerId: 'customer-1',
    reason: '客户申请退款',
    amountCents: order.amount_cents,
  });

  await reviewRefundRequest(client, {
    refundRequestId: refund.id,
    status: 'rejected',
    reviewerId: 'admin-1',
    note: '凭证不足，驳回',
  });

  const audit = client.state.auditLogs.at(-1);
  assert.equal(audit.action, 'refund.review');
  assert.equal(audit.target_type, 'refund_request');
  assert.equal(audit.target_id, refund.id);
  assert.equal(audit.metadata.status, 'rejected');
  assert.equal(audit.metadata.orderId, order.id);
  assert.equal(audit.metadata.note, '凭证不足，驳回');
});

test('shipping pending fulfillment order records shipment and audit log', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'CARD-001', quantity: 1 }],
    address: { receiver_name: '王先生', phone: '13800000000', detail_address: '测试地址' },
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents + order.freight_cents,
    provider: 'manual',
  });
  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });

  const shipment = await markOrderShipped(client, {
    orderId: order.id,
    carrier: '顺丰速运',
    trackingNo: 'SF123456789',
    actorUserId: 'admin-1',
  });

  assert.equal(shipment.tracking_no, 'SF123456789');
  assert.equal(client.state.orders[0].status, 'shipped');
  assert.equal(client.state.auditLogs.at(-1).action, 'order.ship');
  assert.equal(client.state.auditLogs.at(-1).target_id, order.id);
});

test('shipping rejects orders that are not awaiting fulfillment', async () => {
  const client = createCommerceClient();
  const order = await createOrder(client, {
    customerId: 'customer-1',
    items: [{ sku: 'REPORT-3', quantity: 1 }],
  });
  const payment = await createPaymentIntent(client, {
    orderId: order.id,
    amountCents: order.amount_cents,
    provider: 'manual',
  });
  await markPaymentPaid(client, { paymentIntentId: payment.id, actorUserId: 'admin-1' });

  await assert.rejects(
    () => markOrderShipped(client, {
      orderId: order.id,
      carrier: '顺丰速运',
      trackingNo: 'SF123456789',
      actorUserId: 'admin-1',
    }),
    /INVALID_ORDER_STATUS/,
  );
  assert.equal(client.state.orders[0].status, 'paid');
  assert.equal(client.state.shipments.length, 0);
});

test('commerce admin product route requires session and reads database products when pool is configured', async () => {
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'admin', user_id: 'admin-1', status: 'active', display_name: '管理员' }] };
      }
      if (text.includes('from app.commerce_products')) {
        return {
          rows: [{
            id: 'product-db',
            sku: 'DB-REPORT',
            name: '数据库报告包',
            product_type: 'report_quota',
            price_cents: 1290,
            currency: 'CNY',
            entitlement_payload: { amount: 5 },
            requires_shipping: false,
            status: 'active',
          }],
        };
      }
      throw new Error(`Unexpected pool query: ${text}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const unauthorized = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/products`);
    assert.equal(unauthorized.status, 401);

    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/products`, {
      headers: { Authorization: 'Bearer test-token' },
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.products.length, 1);
    assert.equal(data.products[0].sku, 'DB-REPORT');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('customer order routes include latest shipment details', async () => {
  const pool = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '瀹㈡埛' }] };
      }
      if (text.includes('from app.commerce_orders') && text.includes('id = $1') && text.includes('customer_id = $2')) {
        assert.match(text, /shipments/);
        assert.deepEqual(params, ['order-1', 'customer-1']);
        return {
          rows: [
            {
              id: 'order-1',
              customer_id: 'customer-1',
              status: 'shipped',
              shipment: { carrier: 'SF Express', tracking_no: 'SF123456', shipped_at: '2026-05-30T08:00:00.000Z' },
            },
          ],
        };
      }
      if (text.includes('from app.commerce_orders') && text.includes('order by o.created_at')) {
        assert.match(text, /shipments/);
        assert.deepEqual(params, ['customer-1']);
        return {
          rows: [
            {
              id: 'order-1',
              customer_id: 'customer-1',
              status: 'shipped',
              shipment: { carrier: 'SF Express', tracking_no: 'SF123456', shipped_at: '2026-05-30T08:00:00.000Z' },
            },
          ],
        };
      }
      throw new Error(`Unexpected pool query: ${text}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const listResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/orders`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const listData = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listData.orders[0].shipment.tracking_no, 'SF123456');

    const detailResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/orders/order-1`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const detailData = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    assert.equal(detailData.order.shipment.carrier, 'SF Express');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('customer order route rejects real wechat payment when switch is disabled', async () => {
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      throw new Error(`Wechat disabled path should not reach commerce query: ${text}`);
    },
    async connect() {
      throw new Error('Wechat disabled path should not open commerce transaction');
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret', WECHAT_PAY_ENABLED: 'false' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/orders`, {
      method: 'POST',
      headers: { Authorization: 'Bearer customer-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'wechat_jsapi',
        items: [{ sku: 'REPORT-3', quantity: 1 }],
      }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'WECHAT_PAY_DISABLED' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('editor sessions cannot access commerce admin operations', async () => {
  const queries = [];
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      queries.push({ sql: text });
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'editor', user_id: 'editor-1', status: 'active', display_name: '编辑' }] };
      }
      throw new Error(`Editor should not reach commerce query: ${text}`);
    },
    async connect() {
      throw new Error('Editor should not open commerce transaction');
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const request of [
      { path: '/destiny-api/admin/products', method: 'GET' },
      { path: '/destiny-api/admin/payments/payment-1/mark-paid', method: 'POST' },
      { path: '/destiny-api/admin/orders/order-1/ship', method: 'POST' },
      { path: '/destiny-api/admin/refund-requests/refund-1/review', method: 'POST' },
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${request.path}`, {
        method: request.method,
        headers: { Authorization: 'Bearer editor-token', 'Content-Type': 'application/json' },
        body: request.method === 'POST' ? JSON.stringify({ note: '越权尝试' }) : undefined,
      });

      assert.equal(response.status, 403);
    }

    assert.ok(queries.length >= 4);
    assert.ok(queries.every((query) => query.sql.includes('from app.login_sessions')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
