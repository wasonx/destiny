import { checkHealth } from '../ops/health-service.mjs';
import { listRecentErrors } from '../ops/log-service.mjs';

export function mountOpsRoutes(app, { config, pool, graphDriver }) {
  app.get('/destiny-api/admin/ops/health', async (_req, res) => {
    res.json(await checkHealth({ config, pool, graphDriver }));
  });

  app.get('/destiny-api/admin/ops/recent-errors', (_req, res) => {
    res.json({ errors: listRecentErrors() });
  });
}
