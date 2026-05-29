import { summarizeFourPillars } from '../rules/bazi-features.mjs';

export function mountTestBenchRoutes(app) {
  app.post('/destiny-api/admin/testbench/four-pillars', (req, res) => {
    res.json(summarizeFourPillars(req.body || {}));
  });
}
