export async function createRefundRequest(client, { orderId, customerId, reason, amountCents }) {
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
  const result = await client.query(
    `
      update app.refund_requests
      set status = $2, reviewer_id = $3, review_note = $4, reviewed_at = now()
      where id = $1
      returning *
    `,
    [refundRequestId, status, reviewerId, note || ''],
  );
  return result.rows[0];
}
