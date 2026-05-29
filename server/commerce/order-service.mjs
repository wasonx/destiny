import { createManualPaymentIntent } from './payment-providers/manual-provider.mjs';
import { createWechatPlaceholderPaymentIntent } from './payment-providers/wechat-placeholder-provider.mjs';
import { assertPaymentTransition } from './payment-state-machine.mjs';

export function createOrderNo() {
  return `ZS${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createPaymentIntent(client, { orderId, amountCents, provider = 'manual' }) {
  const providerResult = provider === 'wechat_placeholder'
    ? createWechatPlaceholderPaymentIntent()
    : createManualPaymentIntent();
  const result = await client.query(
    `
      insert into app.payment_intents(order_id, provider, status, amount_cents, provider_payload)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [orderId, providerResult.provider, providerResult.status, amountCents, providerResult.providerPayload],
  );
  return result.rows[0];
}

export async function markPaymentPaid(client, { paymentIntentId, actorUserId }) {
  const payment = await client.query('select * from app.payment_intents where id = $1 for update', [paymentIntentId]);
  const row = payment.rows[0];
  if (!row) throw new Error('PAYMENT_NOT_FOUND');
  assertPaymentTransition(row.status, 'paid');

  const result = await client.query(
    `
      update app.payment_intents
      set status = 'paid', paid_at = now(), updated_at = now()
      where id = $1
      returning *
    `,
    [paymentIntentId],
  );
  await client.query(
    `
      update app.commerce_orders
      set status = 'paid', updated_at = now()
      where id = $1
    `,
    [row.order_id],
  );
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id)
      values ($1, 'payment.mark_paid', 'payment_intent', $2)
    `,
    [actorUserId, paymentIntentId],
  );
  return result.rows[0];
}

export async function markOrderShipped(client, { orderId, carrier, trackingNo, actorUserId }) {
  const shipment = await client.query(
    `
      insert into app.shipments(order_id, carrier, tracking_no, created_by)
      values ($1, $2, $3, $4)
      returning *
    `,
    [orderId, carrier, trackingNo, actorUserId],
  );
  await client.query("update app.commerce_orders set status = 'shipped', updated_at = now() where id = $1", [orderId]);
  return shipment.rows[0];
}
