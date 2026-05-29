import { grantPoints, grantReportQuota } from '../entitlements/ledger-service.mjs';

async function recordDelivery(client, { orderId, itemSku, deliveryType, status = 'delivered', payload = {} }) {
  const result = await client.query(
    `
      insert into app.entitlement_deliveries(order_id, item_sku, delivery_type, status, payload)
      values ($1, $2, $3, $4, $5)
      on conflict (order_id, item_sku, delivery_type) do nothing
      returning *
    `,
    [orderId, itemSku, deliveryType, status, payload],
  );
  return result.rowCount > 0;
}

export async function deliverOrderItem(client, { customerId, orderId, item, actorUserId = null }) {
  const type = item.product_type || item.productType;
  if (type === 'report_quota') {
    const shouldDeliver = await recordDelivery(client, {
      orderId,
      itemSku: item.sku,
      deliveryType: 'reportQuota',
      payload: { amount: Number(item.quantity || 1) * Number(item.entitlement_payload?.amount || 1) },
    });
    if (!shouldDeliver) return;
    await grantReportQuota(client, {
      customerId,
      amount: Number(item.quantity || 1) * Number(item.entitlement_payload?.amount || 1),
      reason: 'commerce_order',
      referenceType: 'order',
      referenceId: orderId,
      actorUserId,
    });
  }
  if (type === 'monthly_membership' || type === 'yearly_membership') {
    const durationDays = type === 'yearly_membership' ? 365 : 31;
    const shouldDeliver = await recordDelivery(client, {
      orderId,
      itemSku: item.sku,
      deliveryType: 'membershipPlan',
      payload: { planCode: type === 'yearly_membership' ? 'yearly' : 'monthly', durationDays },
    });
    if (!shouldDeliver) return;
    await client.query(
      `
        insert into app.customer_memberships(customer_id, plan_code, starts_at, expires_at, source)
        values ($1, $2, now(), now() + ($3 || ' days')::interval, 'commerce_order')
      `,
      [customerId, type === 'yearly_membership' ? 'yearly' : 'monthly', durationDays],
    );
  }
  if (type === 'digital_content') {
    await recordDelivery(client, {
      orderId,
      itemSku: item.sku,
      deliveryType: 'digitalContent',
      payload: { digitalContentSku: item.entitlement_payload?.digitalContentSku || item.sku },
    });
  }
  if (type === 'physical_goods') {
    await recordDelivery(client, {
      orderId,
      itemSku: item.sku,
      deliveryType: 'physicalFulfillment',
      status: 'pending',
      payload: { inventorySku: item.entitlement_payload?.inventorySku || item.sku, quantity: Number(item.quantity || 1) },
    });
  }
}

export async function deliverOrderEntitlements(client, { order, actorUserId = null }) {
  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    await deliverOrderItem(client, {
      customerId: order.customer_id,
      orderId: order.id,
      item,
      actorUserId,
    });
  }

  const points = Math.floor(Number(order.amount_cents || 0) / 100);
  const shouldGrantPoints = points > 0 && await recordDelivery(client, {
    orderId: order.id,
    itemSku: 'ORDER',
    deliveryType: 'points',
    payload: { amount: points },
  });
  if (!shouldGrantPoints) return;
  await grantPoints(client, {
    customerId: order.customer_id,
    amount: points,
    reason: 'commerce_order',
    referenceType: 'order',
    referenceId: order.id,
    actorUserId,
  });
}
