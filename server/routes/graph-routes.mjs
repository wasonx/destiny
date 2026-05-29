import { branchConflicts, earthlyBranches, elementCycles, fiveElements, heavenlyStems, tenGods } from '../graph/bazi-seed-data.mjs';

const concepts = [
  ...fiveElements.map((item) => ({ ...item, type: '五行' })),
  ...heavenlyStems.map((item) => ({ ...item, type: '天干' })),
  ...earthlyBranches.map((item) => ({ ...item, type: '地支' })),
  ...tenGods.map((item) => ({ ...item, type: '十神' })),
];

export function mountGraphRoutes(app, { config, graphDriver }) {
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

  app.get('/destiny-api/admin/graph/concepts/:key/paths', (req, res) => {
    const concept = concepts.find((item) => item.key === req.params.key || item.label === req.params.key);
    if (!concept) {
      res.status(404).json({ error: 'CONCEPT_NOT_FOUND' });
      return;
    }
    res.json({
      concept,
      nodes: concepts.slice(0, 12),
      relationships: [
        ...elementCycles.generates.map(([from, to]) => ({ from, to, type: 'GENERATES' })),
        ...elementCycles.restrains.map(([from, to]) => ({ from, to, type: 'RESTRAINS' })),
        ...branchConflicts.map(([from, to]) => ({ from, to, type: 'CONFLICTS_WITH' })),
      ],
    });
  });
}
