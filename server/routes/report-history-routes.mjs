import { memory } from './memory-state.mjs';

export function mountReportHistoryRoutes(app, { pool }) {
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

  app.get('/destiny-api/customer/report-runs', (_req, res) => {
    res.json({ reportRuns: memory.reportRuns });
  });
}
