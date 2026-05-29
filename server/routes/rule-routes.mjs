import { runRules } from '../rules/rule-engine.mjs';
import { memory, nextId } from './memory-state.mjs';

export function mountRuleRoutes(app) {
  app.get('/destiny-api/admin/rules', (_req, res) => res.json({ rules: memory.rules }));

  app.post('/destiny-api/admin/rules', (req, res) => {
    const rule = { id: nextId('rule'), status: 'draft', priority: 100, weight: 0, ...req.body };
    memory.rules.unshift(rule);
    res.status(201).json({ rule });
  });

  app.patch('/destiny-api/admin/rules/:id', (req, res) => {
    const rule = memory.rules.find((item) => item.id === req.params.id);
    Object.assign(rule, req.body || {});
    res.json({ rule });
  });

  app.post('/destiny-api/admin/rules/:id/publish', (req, res) => {
    const rule = memory.rules.find((item) => item.id === req.params.id);
    if (rule) rule.status = 'published';
    res.json({ rule });
  });

  app.post('/destiny-api/admin/rules/:id/disable', (req, res) => {
    const rule = memory.rules.find((item) => item.id === req.params.id);
    if (rule) rule.status = 'disabled';
    res.json({ rule });
  });

  app.post('/destiny-api/admin/rules/test', (req, res) => {
    res.json({ hits: runRules(req.body?.rules || memory.rules, req.body?.facts || {}) });
  });
}
