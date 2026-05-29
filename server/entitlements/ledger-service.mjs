import { calculateGrowthLevel } from './growth-service.mjs';

export async function grantReportQuota(client, { customerId, amount, reason, referenceType, referenceId, actorUserId = null }) {
  await client.query(
    `
      insert into app.entitlement_accounts(customer_id, report_quota_balance)
      values ($1, 0)
      on conflict (customer_id) do nothing
    `,
    [customerId],
  );
  const account = await client.query(
    `
      update app.entitlement_accounts
      set report_quota_balance = report_quota_balance + $2, updated_at = now()
      where customer_id = $1
      returning report_quota_balance
    `,
    [customerId, amount],
  );
  const balance = account.rows[0].report_quota_balance;
  await client.query(
    `
      insert into app.entitlement_ledger(customer_id, amount, balance_after, reason, reference_type, reference_id, actor_user_id)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [customerId, amount, balance, reason, referenceType, referenceId, actorUserId],
  );
  return balance;
}

export async function spendReportQuota(client, { customerId, amount, reason, referenceType, referenceId }) {
  const account = await client.query(
    `
      update app.entitlement_accounts
      set report_quota_balance = report_quota_balance - $2, updated_at = now()
      where customer_id = $1 and report_quota_balance >= $2
      returning report_quota_balance
    `,
    [customerId, amount],
  );
  if (!account.rowCount) {
    const error = new Error('INSUFFICIENT_REPORT_QUOTA');
    error.code = 'INSUFFICIENT_REPORT_QUOTA';
    throw error;
  }
  const balance = account.rows[0].report_quota_balance;
  await client.query(
    `
      insert into app.entitlement_ledger(customer_id, amount, balance_after, reason, reference_type, reference_id)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [customerId, -Math.abs(amount), balance, reason, referenceType, referenceId],
  );
  return balance;
}

export async function grantPoints(client, { customerId, amount, reason, referenceType, referenceId, actorUserId = null }) {
  await client.query(
    `
      insert into app.points_accounts(customer_id, points_balance, lifetime_points, growth_level)
      values ($1, 0, 0, '启蒙')
      on conflict (customer_id) do nothing
    `,
    [customerId],
  );
  const current = await client.query('select points_balance, lifetime_points from app.points_accounts where customer_id = $1', [customerId]);
  const pointsBalance = Number(current.rows[0].points_balance) + Number(amount);
  const lifetimePoints = Number(current.rows[0].lifetime_points) + Math.max(0, Number(amount));
  const growthLevel = calculateGrowthLevel(lifetimePoints);
  await client.query(
    `
      update app.points_accounts
      set points_balance = $2, lifetime_points = $3, growth_level = $4, updated_at = now()
      where customer_id = $1
    `,
    [customerId, pointsBalance, lifetimePoints, growthLevel],
  );
  await client.query(
    `
      insert into app.points_ledger(customer_id, amount, balance_after, lifetime_after, growth_level_after, reason, reference_type, reference_id, actor_user_id)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [customerId, amount, pointsBalance, lifetimePoints, growthLevel, reason, referenceType, referenceId, actorUserId],
  );
  return { pointsBalance, lifetimePoints, growthLevel };
}
