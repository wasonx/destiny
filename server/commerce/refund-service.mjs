function normalizeItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function assertRefundableOrder(order) {
  const refundableStatuses = new Set(['paid', 'pending_fulfillment', 'shipped', 'completed']);
  if (!order || !refundableStatuses.has(order.status)) {
    const error = new Error(`INVALID_REFUND_ORDER_STATUS:${order?.status || 'missing'}`);
    error.code = 'INVALID_REFUND_ORDER_STATUS';
    throw error;
  }
}

function rejectedOrderStatus(order) {
  const items = normalizeItems(order?.items);
  return items.some((item) => item.requires_shipping || item.product_type === 'physical_goods')
    ? 'pending_fulfillment'
    : 'paid';
}

export async function createRefundRequest(client, { orderId, customerId, reason, amountCents }) {
  const order = await client.query('select * from app.commerce_orders where id = $1 for update', [orderId]);
  assertRefundableOrder(order.rows[0]);

  const result = await client.query(
    `
      insert into app.refund_requests(order_id, customer_id, reason, amount_cents)
      values ($1, $2, $3, $4)
      returning *
    `,
    [orderId, customerId, reason, amountCents],
  );
  return result.rows[0];
}

export async function reviewRefundRequest(client, { refundRequestId, status, reviewerId, note }) {
  const existing = await client.query('select * from app.refund_requests where id = $1 for update', [refundRequestId]);
  const refund = existing.rows[0];
  if (!refund) {
    const error = new Error('REFUND_NOT_FOUND');
    error.code = 'REFUND_NOT_FOUND';
    throw error;
  }

  const result = await client.query(
    `
      update app.refund_requests
      set status = $2, reviewer_id = $3, review_note = $4, reviewed_at = now()
      where id = $1
      returning *
    `,
    [refundRequestId, status, reviewerId, note || ''],
  );

  const order = await client.query('select * from app.commerce_orders where id = $1 for update', [refund.order_id]);
  const nextOrderStatus = status === 'approved' || status === 'processed'
    ? 'refunded'
    : rejectedOrderStatus(order.rows[0]);
  await client.query(
    `
      update app.commerce_orders
      set status = $2, updated_at = now()
      where id = $1
      returning *
    `,
    [refund.order_id, nextOrderStatus],
  );

  return result.rows[0];
}
