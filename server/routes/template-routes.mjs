import { memory, nextId } from './memory-state.mjs';

export function mountTemplateRoutes(app) {
  app.get('/destiny-api/admin/templates', (_req, res) => res.json({ templates: memory.templates }));

  app.post('/destiny-api/admin/templates', (req, res) => {
    const template = { id: nextId('template'), status: 'draft', sections: [], tone: '亲民、克制、可解释', ...req.body };
    memory.templates.unshift(template);
    res.status(201).json({ template });
  });

  app.patch('/destiny-api/admin/templates/:id', (req, res) => {
    const template = memory.templates.find((item) => item.id === req.params.id);
    Object.assign(template, req.body || {});
    res.json({ template });
  });

  app.post('/destiny-api/admin/templates/:id/publish', (req, res) => {
    const template = memory.templates.find((item) => item.id === req.params.id);
    if (template) template.status = 'published';
    res.json({ template });
  });

  app.post('/destiny-api/admin/templates/:id/preview', (req, res) => {
    const template = memory.templates.find((item) => item.id === req.params.id) || req.body;
    res.json({ preview: { title: template.name || '预览报告', sections: template.sections || [] } });
  });
}
