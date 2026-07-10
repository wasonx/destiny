import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountAdminAuthRoutes } from './routes/admin-auth-routes.mjs';
import { mountAuditRoutes } from './routes/audit-routes.mjs';
import { mountCommerceRoutes } from './routes/commerce-routes.mjs';
import { mountCustomerAuthRoutes } from './routes/customer-auth-routes.mjs';
import { mountEntitlementRoutes } from './routes/entitlement-routes.mjs';
import { mountGraphRoutes } from './routes/graph-routes.mjs';
import { mountKnowledgeRoutes } from './routes/knowledge-routes.mjs';
import { mountLegalRoutes } from './routes/legal-routes.mjs';
import { mountOpsRoutes } from './routes/ops-routes.mjs';
import { mountReportHistoryRoutes } from './routes/report-history-routes.mjs';
import { mountReportRoutes } from './routes/report-routes.mjs';
import { mountRuleRoutes } from './routes/rule-routes.mjs';
import { mountSettingsRoutes } from './routes/settings-routes.mjs';
import { mountTemplateRoutes } from './routes/template-routes.mjs';
import { mountTestBenchRoutes } from './routes/testbench-routes.mjs';
import { mountUserRoutes } from './routes/user-routes.mjs';
import { requireSession } from './middleware/require-session.mjs';
import { createPublishingGraphSyncService } from './graph/publishing-graph-sync-service.mjs';

export function createApp({ config, pool = null, graphDriver = null, wechatSessionProvider = null } = {}) {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  app.use('/destiny-api/uploads', express.static(uploadsDir, { maxAge: '7d' }));
  const publishingGraphSync = createPublishingGraphSyncService({ graphDriver, database: config.neo4jDatabase });

  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl === '/destiny-api/payments/wechat/notify') {
        req.rawBody = buffer.toString('utf8');
      }
    },
  }));

  mountReportRoutes(app, { config, pool, graphDriver });
  mountLegalRoutes(app);
  mountAdminAuthRoutes(app, { config, pool });
  if (pool) {
    app.use('/destiny-api/admin', requireSession({ config, pool, accountTypes: ['editor', 'admin'] }));
  }
  mountCustomerAuthRoutes(app, { config, pool, wechatSessionProvider });
  mountKnowledgeRoutes(app, { pool, publishingGraphSync });
  mountGraphRoutes(app, { config, graphDriver, pool });
  mountTestBenchRoutes(app);
  mountRuleRoutes(app, { pool, publishingGraphSync });
  mountTemplateRoutes(app, { pool, publishingGraphSync });
  mountReportHistoryRoutes(app, { config, pool });
  mountEntitlementRoutes(app, { config, pool });
  mountUserRoutes(app, { pool });
  mountAuditRoutes(app, { pool });
  mountSettingsRoutes(app, { config, pool });
  mountCommerceRoutes(app, { config, pool });
  mountOpsRoutes(app, { config, pool, graphDriver });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  return app;
}
