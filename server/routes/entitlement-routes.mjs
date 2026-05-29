import { grantPoints, grantReportQuota } from '../entitlements/ledger-service.mjs';
import { getCustomerValueState } from '../entitlements/membership-service.mjs';
import { findSession } from '../middleware/require-session.mjs';

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
    res.json(await getCustomerValueState(pool, req.params.customerId));
  });

  app.post('/destiny-api/admin/customers/:customerId/grant-quota', async (req, res) => {
    if (!pool) {
      res.json({ ok: true, reportQuotaBalance: Number(req.body?.amount || 0) });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const balance = await grantReportQuota(client, {
        customerId: req.params.customerId,
        amount: Number(req.body.amount || 1),
        reason: req.body.reason || 'manual_grant',
        referenceType: 'admin',
        referenceId: req.params.customerId,
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
    if (!pool) {
      res.json({ ok: true });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const state = await grantPoints(client, {
        customerId: req.params.customerId,
        amount: Number(req.body.amount || 0),
        reason: req.body.reason || 'manual_grant',
        referenceType: 'admin',
        referenceId: req.params.customerId,
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
    if (!pool) {
      res.json({ ok: true, membership: req.body });
      return;
    }
    await pool.query(
      `
        insert into app.customer_memberships(customer_id, plan_code, starts_at, expires_at, source)
        values ($1, $2, now(), now() + ($3 || ' days')::interval, 'manual')
      `,
      [req.params.customerId, req.body.planCode || 'monthly', Number(req.body.durationDays || 31)],
    );
    res.json({ ok: true });
  });
}
