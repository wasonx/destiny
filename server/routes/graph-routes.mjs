import { earthlyBranches, fiveElements, heavenlyStems, tenGods } from '../graph/bazi-seed-data.mjs';
import { createGraphQueryService } from '../graph/graph-query-service.mjs';

const concepts = [
  ...fiveElements.map((item) => ({ ...item, type: '五行' })),
  ...heavenlyStems.map((item) => ({ ...item, type: '天干' })),
  ...earthlyBranches.map((item) => ({ ...item, type: '地支' })),
  ...tenGods.map((item) => ({ ...item, type: '十神' })),
];

function sendGraphError(res, error) {
  if (String(error.message || '').endsWith('_NOT_FOUND')) {
    res.status(404).json({ error: error.message });
    return;
  }
  throw error;
}

export function mountGraphRoutes(app, { config, graphDriver, pool = null }) {
  const graphService = createGraphQueryService({ graphDriver, database: config.neo4jDatabase });

  app.get('/destiny-api/admin/graph/health', async (_req, res) => {
    if (!graphDriver) {
      res.json({ ok: false, reason: 'NEO4J_NOT_CONFIGURED' });
      return;
    }
    const session = graphDriver.session({ database: config.neo4jDatabase });
    try {
      await session.run('return 1');
      res.json({ ok: true });
    } catch (error) {
      res.status(503).json({ ok: false, error: error.message });
    } finally {
      await session.close();
    }
  });

  app.get('/destiny-api/admin/graph/concepts', (req, res) => {
    const type = req.query.type;
    res.json({ concepts: type ? concepts.filter((item) => item.type === type) : concepts });
  });

  app.get('/destiny-api/admin/graph/concepts/:key/paths', async (req, res) => {
    const concept = concepts.find((item) => item.key === req.params.key || item.label === req.params.key);
    if (!concept) {
      res.status(404).json({ error: 'CONCEPT_NOT_FOUND' });
      return;
    }
    const graph = await graphService.getConceptGraph(req.params.key);
    res.json({ ...graph, concept: graph.focus, relationships: graph.edges });
  });

  app.get('/destiny-api/admin/graph/knowledge/:id', async (req, res) => {
    if (!pool) {
      res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
      return;
    }
    try {
      res.json(await graphService.getKnowledgeGraph(req.params.id, { pool }));
    } catch (error) {
      sendGraphError(res, error);
    }
  });

  app.get('/destiny-api/admin/graph/rules/:id', async (req, res) => {
    if (!pool) {
      res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
      return;
    }
    try {
      res.json(await graphService.getRuleGraph(req.params.id, { pool }));
    } catch (error) {
      sendGraphError(res, error);
    }
  });

  app.get('/destiny-api/admin/graph/templates/:id', async (req, res) => {
    if (!pool) {
      res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
      return;
    }
    try {
      res.json(await graphService.getTemplateGraph(req.params.id, { pool }));
    } catch (error) {
      sendGraphError(res, error);
    }
  });

  app.get('/destiny-api/admin/graph/reports/:id', async (req, res) => {
    if (!pool) {
      res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
      return;
    }
    try {
      res.json(await graphService.getReportGraph(req.params.id, { pool }));
    } catch (error) {
      sendGraphError(res, error);
    }
  });
}
