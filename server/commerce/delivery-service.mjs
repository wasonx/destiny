import { grantPoints, grantReportQuota } from '../entitlements/ledger-service.mjs';

export async function deliverOrderItem(client, { customerId, orderId, item, actorUserId = null }) {
  const type = item.product_type || item.productType;
  if (type === 'report_quota') {
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
    await client.query(
      `
        insert into app.customer_memberships(customer_id, plan_code, starts_at, expires_at, source)
        values ($1, $2, now(), now() + ($3 || ' days')::interval, 'commerce_order')
      `,
      [customerId, type === 'yearly_membership' ? 'yearly' : 'monthly', durationDays],
    );
  }
  await grantPoints(client, {
    customerId,
    amount: Math.floor(Number(item.price_cents || 0) / 100),
    reason: 'commerce_order',
    referenceType: 'order',
    referenceId: orderId,
    actorUserId,
  });
}
