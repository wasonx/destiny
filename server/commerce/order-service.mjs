import { createManualPaymentIntent } from './payment-providers/manual-provider.mjs';
import { createWechatPlaceholderPaymentIntent } from './payment-providers/wechat-placeholder-provider.mjs';
import { assertPaymentTransition } from './payment-state-machine.mjs';
import { deliverOrderEntitlements } from './delivery-service.mjs';
import { deductInventory } from './inventory-service.mjs';

export function createOrderNo() {
  return `ZS${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createOrder(client, {
  customerId,
  items = [],
  address = null,
  freightCents = 800,
  freeFreightThresholdCents = 9900,
} = {}) {
  const requestedItems = items
    .map((item) => ({ sku: item.sku, quantity: Math.max(1, Number(item.quantity || 1)) }))
    .filter((item) => item.sku);
  if (!customerId || requestedItems.length === 0) {
    const error = new Error('INVALID_ORDER');
    error.code = 'INVALID_ORDER';
    throw error;
  }

  const skus = [...new Set(requestedItems.map((item) => item.sku))];
  const products = await client.query(
    `
      select *
      from app.commerce_products
      where sku = any($1) and status = 'active'
    `,
    [skus],
  );
  const productBySku = new Map(products.rows.map((product) => [product.sku, product]));
  const missingSku = skus.find((sku) => !productBySku.has(sku));
  if (missingSku) {
    const error = new Error(`PRODUCT_NOT_AVAILABLE:${missingSku}`);
    error.code = 'PRODUCT_NOT_AVAILABLE';
    throw error;
  }

  const snapshots = requestedItems.map((requested) => {
    const product = productBySku.get(requested.sku);
    return {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      product_type: product.product_type,
      price_cents: Number(product.price_cents),
      currency: product.currency,
      quantity: requested.quantity,
      entitlement_payload: product.entitlement_payload || {},
      requires_shipping: Boolean(product.requires_shipping),
    };
  });
  const amountCents = snapshots.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const requiresShipping = snapshots.some((item) => item.requires_shipping || item.product_type === 'physical_goods');
  if (requiresShipping && !address) {
    const error = new Error('ADDRESS_REQUIRED');
    error.code = 'ADDRESS_REQUIRED';
    throw error;
  }
  const actualFreightCents = requiresShipping && amountCents < freeFreightThresholdCents ? Number(freightCents) : 0;

  const order = await client.query(
    `
      insert into app.commerce_orders(customer_id, order_no, amount_cents, freight_cents, address_snapshot, items)
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [customerId, createOrderNo(), amountCents, actualFreightCents, address ? JSON.stringify(address) : null, JSON.stringify(snapshots)],
  );
  return order.rows[0];
}

export async function createPaymentIntent(client, { orderId, amountCents, provider = 'manual', providerResult = null }) {
  const resolvedProviderResult = providerResult || (provider === 'wechat_placeholder'
    ? createWechatPlaceholderPaymentIntent()
    : createManualPaymentIntent());
  const result = await client.query(
    `
      insert into app.payment_intents(order_id, provider, status, amount_cents, provider_payload)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [orderId, resolvedProviderResult.provider, resolvedProviderResult.status, amountCents, resolvedProviderResult.providerPayload],
  );
  return result.rows[0];
}

export async function markPaymentPaid(client, { paymentIntentId, actorUserId = null, providerPayloadPatch = {}, idempotent = false }) {
  const payment = await client.query('select * from app.payment_intents where id = $1 for update', [paymentIntentId]);
  const row = payment.rows[0];
  if (!row) throw new Error('PAYMENT_NOT_FOUND');
  if (row.status === 'paid' && idempotent) return row;
  assertPaymentTransition(row.status, 'paid');

  const orderResult = await client.query('select * from app.commerce_orders where id = $1 for update', [row.order_id]);
  const order = orderResult.rows[0];
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending_payment') {
    const error = new Error(`INVALID_ORDER_STATUS:${order.status}`);
    error.code = 'INVALID_ORDER_STATUS';
    throw error;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    if (item.requires_shipping || item.product_type === 'physical_goods') {
      await deductInventory(client, {
        sku: item.entitlement_payload?.inventorySku || item.sku,
        quantity: Number(item.quantity || 1),
        referenceType: 'order',
        referenceId: order.id,
      });
    }
  }

  const nextOrderStatus = items.some((item) => item.requires_shipping || item.product_type === 'physical_goods')
    ? 'pending_fulfillment'
    : 'paid';

  const result = await client.query(
    `
      update app.payment_intents
      set status = 'paid',
          paid_at = coalesce(paid_at, now()),
          provider_payload = provider_payload || $2::jsonb,
          updated_at = now()
      where id = $1
      returning *
    `,
    [paymentIntentId, JSON.stringify(providerPayloadPatch || {})],
  );
  await client.query(
    `
      update app.commerce_orders
      set status = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [row.order_id, nextOrderStatus],
  );
  await deliverOrderEntitlements(client, {
    order: { ...order, status: nextOrderStatus },
    actorUserId,
  });
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId, 'payment.mark_paid', 'payment_intent', paymentIntentId, providerPayloadPatch || {}],
  );
  return result.rows[0];
}

export async function markOrderShipped(client, { orderId, carrier, trackingNo, actorUserId }) {
  const normalizedCarrier = String(carrier || '').trim();
  const normalizedTrackingNo = String(trackingNo || '').trim();
  if (!normalizedCarrier || !normalizedTrackingNo) {
    const error = new Error('INVALID_SHIPMENT');
    error.code = 'INVALID_SHIPMENT';
    throw error;
  }

  const orderResult = await client.query('select * from app.commerce_orders where id = $1 for update', [orderId]);
  const order = orderResult.rows[0];
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending_fulfillment') {
    const error = new Error(`INVALID_ORDER_STATUS:${order.status}`);
    error.code = 'INVALID_ORDER_STATUS';
    throw error;
  }

  const shipment = await client.query(
    `
      insert into app.shipments(order_id, carrier, tracking_no, created_by)
      values ($1, $2, $3, $4)
      returning *
    `,
    [orderId, normalizedCarrier, normalizedTrackingNo, actorUserId],
  );
  await client.query(
    `
      update app.commerce_orders
      set status = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [orderId, 'shipped'],
  );
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId, 'order.ship', 'commerce_order', orderId, { carrier: normalizedCarrier, trackingNo: normalizedTrackingNo }],
  );
  return shipment.rows[0];
}

export async function closeOrder(client, { orderId, actorUserId, reason = '' }) {
  const orderResult = await client.query('select * from app.commerce_orders where id = $1 for update', [orderId]);
  const order = orderResult.rows[0];
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending_payment') {
    const error = new Error(`INVALID_ORDER_STATUS:${order.status}`);
    error.code = 'INVALID_ORDER_STATUS';
    throw error;
  }

  const result = await client.query(
    `
      update app.commerce_orders
      set status = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [orderId, 'closed'],
  );
  await client.query(
    `
      update app.payment_intents
      set status = 'cancelled', updated_at = now()
      where order_id = $1 and status in ('created', 'pending')
    `,
    [orderId],
  );
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId, 'order.close', 'commerce_order', orderId, { reason: reason || '后台关闭未支付订单' }],
  );
  return result.rows[0];
}
