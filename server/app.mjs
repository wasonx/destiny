import express from 'express';
import { mountAdminAuthRoutes } from './routes/admin-auth-routes.mjs';
import { mountCommerceRoutes } from './routes/commerce-routes.mjs';
import { mountCustomerAuthRoutes } from './routes/customer-auth-routes.mjs';
import { mountEntitlementRoutes } from './routes/entitlement-routes.mjs';
import { mountGraphRoutes } from './routes/graph-routes.mjs';
import { mountKnowledgeRoutes } from './routes/knowledge-routes.mjs';
import { mountOpsRoutes } from './routes/ops-routes.mjs';
import { mountReportHistoryRoutes } from './routes/report-history-routes.mjs';
import { mountReportRoutes } from './routes/report-routes.mjs';
import { mountRuleRoutes } from './routes/rule-routes.mjs';
import { mountTemplateRoutes } from './routes/template-routes.mjs';
import { mountTestBenchRoutes } from './routes/testbench-routes.mjs';

export function createApp({ config, pool = null, graphDriver = null } = {}) {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  mountReportRoutes(app, { config, pool });
  mountAdminAuthRoutes(app, { config, pool });
  mountCustomerAuthRoutes(app, { config, pool });
  mountKnowledgeRoutes(app, { pool });
  mountGraphRoutes(app, { config, graphDriver });
  mountTestBenchRoutes(app);
  mountRuleRoutes(app, { pool });
  mountTemplateRoutes(app, { pool });
  mountReportHistoryRoutes(app, { pool });
  mountEntitlementRoutes(app, { pool });
  mountCommerceRoutes(app, { pool });
  mountOpsRoutes(app, { config, pool, graphDriver });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  return app;
}
