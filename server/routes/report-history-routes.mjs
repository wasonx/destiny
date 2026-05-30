import { memory } from './memory-state.mjs';
import { findSession } from '../middleware/require-session.mjs';

export function mountReportHistoryRoutes(app, { config, pool }) {
  app.get('/destiny-api/admin/report-runs', async (_req, res) => {
    if (!pool) {
      res.json({ reportRuns: memory.reportRuns });
      return;
    }
    const result = await pool.query('select * from app.report_runs order by created_at desc limit 100');
    res.json({ reportRuns: result.rows });
  });

  app.get('/destiny-api/admin/report-runs/:id', async (req, res) => {
    if (!pool) {
      res.json({ reportRun: memory.reportRuns.find((item) => item.id === req.params.id) || null });
      return;
    }
    const result = await pool.query('select * from app.report_runs where id = $1', [req.params.id]);
    res.json({ reportRun: result.rows[0] || null });
  });

  app.get('/destiny-api/customer/report-runs', async (req, res) => {
    if (!pool) {
      res.json({ reportRuns: memory.reportRuns });
      return;
    }
    const session = await findSession(req, { pool, config, accountTypes: ['customer'] });
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await pool.query(
      `
        select *
        from app.report_runs
        where customer_id = $1
        order by created_at desc
        limit 100
      `,
      [session.user_id],
    );
    res.json({ reportRuns: result.rows });
  });

  app.get('/destiny-api/customer/report-runs/:id', async (req, res) => {
    if (!pool) {
      res.json({ reportRun: memory.reportRuns.find((item) => item.id === req.params.id) || null });
      return;
    }
    const session = await findSession(req, { pool, config, accountTypes: ['customer'] });
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await pool.query(
      `
        select *
        from app.report_runs
        where id = $1 and customer_id = $2
      `,
      [req.params.id, session.user_id],
    );
    res.json({ reportRun: result.rows[0] || null });
  });
}
