export async function getCustomerValueState(pool, customerId) {
  if (!pool || !customerId) {
    return {
      membership: null,
      reportQuotaBalance: 0,
      points: {
        points_balance: 0,
        lifetime_points: 0,
        growth_level: '启蒙',
      },
    };
  }

  const [membership, quota, points] = await Promise.all([
    pool.query(
      `
        select plan_code, starts_at, expires_at, status
        from app.customer_memberships
        where customer_id = $1 and status = 'active' and expires_at > now()
        order by expires_at desc
        limit 1
      `,
      [customerId],
    ),
    pool.query('select report_quota_balance from app.entitlement_accounts where customer_id = $1', [customerId]),
    pool.query('select points_balance, lifetime_points, growth_level from app.points_accounts where customer_id = $1', [customerId]),
  ]);

  return {
    membership: membership.rows[0] || null,
    reportQuotaBalance: quota.rows[0]?.report_quota_balance || 0,
    points: points.rows[0] || {
      points_balance: 0,
      lifetime_points: 0,
      growth_level: '启蒙',
    },
  };
}
