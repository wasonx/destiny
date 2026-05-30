import { grantPoints, grantReportQuota } from '../entitlements/ledger-service.mjs';
import { getCustomerValueState } from '../entitlements/membership-service.mjs';
import { findSession } from '../middleware/require-session.mjs';

function requirePlatformAdmin(req, res) {
  if (req.session?.account_type === 'admin') {
    return true;
  }
  res.status(403).json({ error: 'ADMIN_ONLY' });
  return false;
}

async function writeAudit(client, { actorUserId, action, targetType, targetId, metadata = {} }) {
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId || null, action, targetType, targetId, metadata],
  );
}

export function mountEntitlementRoutes(app, { config, pool }) {
  app.get('/destiny-api/customer/value-state', async (req, res) => {
    if (!pool) {
      res.json(await getCustomerValueState(pool, null));
      return;
    }
    const session = await findSession(req, { pool, config, accountTypes: ['customer'] });
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    res.json(await getCustomerValueState(pool, session.user_id));
  });

  app.get('/destiny-api/admin/customers/:customerId/value-state', async (req, res) => {
    if (pool && !requirePlatformAdmin(req, res)) {
      return;
    }
    res.json(await getCustomerValueState(pool, req.params.customerId));
  });

  app.post('/destiny-api/admin/customers/:customerId/grant-quota', async (req, res) => {
    if (pool && !requirePlatformAdmin(req, res)) {
      return;
    }
    if (!pool) {
      res.json({ ok: true, reportQuotaBalance: Number(req.body?.amount || 0) });
      return;
    }
    const amount = Number(req.body.amount || 1);
    const reason = req.body.reason || 'manual_grant';
    const client = await pool.connect();
    try {
      await client.query('begin');
      const balance = await grantReportQuota(client, {
        customerId: req.params.customerId,
        amount,
        reason,
        referenceType: 'admin',
        referenceId: req.params.customerId,
        actorUserId: req.session.user_id,
      });
      await writeAudit(client, {
        actorUserId: req.session.user_id,
        action: 'entitlement.grant_quota',
        targetType: 'customer',
        targetId: req.params.customerId,
        metadata: { amount, reason, balance },
      });
      await client.query('commit');
      res.json({ ok: true, reportQuotaBalance: balance });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/customers/:customerId/grant-points', async (req, res) => {
    if (pool && !requirePlatformAdmin(req, res)) {
      return;
    }
    if (!pool) {
      const amount = Number(req.body?.amount || 0);
      res.json({
        ok: true,
        points: {
          pointsBalance: amount,
          lifetimePoints: Math.max(0, amount),
          growthLevel: '启蒙',
        },
      });
      return;
    }
    const amount = Number(req.body.amount || 0);
    const reason = req.body.reason || 'manual_grant';
    const client = await pool.connect();
    try {
      await client.query('begin');
      const state = await grantPoints(client, {
        customerId: req.params.customerId,
        amount,
        reason,
        referenceType: 'admin',
        referenceId: req.params.customerId,
        actorUserId: req.session.user_id,
      });
      await writeAudit(client, {
        actorUserId: req.session.user_id,
        action: 'points.grant',
        targetType: 'customer',
        targetId: req.params.customerId,
        metadata: { amount, reason, points: state },
      });
      await client.query('commit');
      res.json({ ok: true, points: state });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/customers/:customerId/grant-membership', async (req, res) => {
    if (pool && !requirePlatformAdmin(req, res)) {
      return;
    }
    if (!pool) {
      res.json({
        ok: true,
        membership: {
          plan_code: req.body?.planCode || 'monthly',
          status: 'active',
        },
      });
      return;
    }
    const planCode = req.body.planCode || 'monthly';
    const durationDays = Number(req.body.durationDays || 31);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const membership = await client.query(
        `
          insert into app.customer_memberships(customer_id, plan_code, starts_at, expires_at, source)
          values ($1, $2, now(), now() + ($3 || ' days')::interval, 'manual')
          returning id, plan_code, starts_at, expires_at, status
        `,
        [req.params.customerId, planCode, durationDays],
      );
      await writeAudit(client, {
        actorUserId: req.session.user_id,
        action: 'membership.grant',
        targetType: 'customer',
        targetId: req.params.customerId,
        metadata: { planCode, durationDays },
      });
      await client.query('commit');
      res.json({ ok: true, membership: membership.rows[0] || { plan_code: planCode, durationDays } });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/memberships/expire-overdue', async (req, res) => {
    if (pool && !requirePlatformAdmin(req, res)) {
      return;
    }
    if (!pool) {
      res.json({ ok: true, expiredMemberships: [] });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const expired = await client.query(
        `
          update app.customer_memberships
          set status = 'expired'
          where status = 'active'
            and expires_at <= now()
          returning id, customer_id, plan_code, expires_at, status
        `,
      );
      await writeAudit(client, {
        actorUserId: req.session.user_id,
        action: 'membership.expire_overdue',
        targetType: 'membership',
        targetId: 'bulk-expire-overdue',
        metadata: {
          expiredCount: expired.rowCount || 0,
          membershipIds: expired.rows.map((row) => row.id),
        },
      });
      await client.query('commit');
      res.json({ ok: true, expiredMemberships: expired.rows });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });
}
