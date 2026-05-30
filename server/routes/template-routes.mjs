import { disableItem, publishItem } from '../content/publishing-service.mjs';
import { requirePlatformAdmin } from '../middleware/roles.mjs';
import { memory, nextId } from './memory-state.mjs';

export function mountTemplateRoutes(app, { pool, publishingGraphSync = null } = {}) {
  app.get('/destiny-api/admin/templates', async (req, res) => {
    if (!pool) {
      const status = req.query.status;
      res.json({ templates: status ? memory.templates.filter((item) => item.status === status) : memory.templates });
      return;
    }
    const status = req.query.status;
    const result = await pool.query(
      `
        select *
        from app.report_templates
        where ($1::text is null or status = $1)
        order by updated_at desc
        limit 100
      `,
      [status || null],
    );
    res.json({ templates: result.rows });
  });

  app.post('/destiny-api/admin/templates', async (req, res) => {
    const body = req.body || {};
    if (!pool) {
      const template = { id: nextId('template'), status: 'draft', sections: [], tone: '亲民、克制、可解释', ...body };
      memory.templates.unshift(template);
      res.status(201).json({ template });
      return;
    }
    const result = await pool.query(
      `
        insert into app.report_templates(module, name, report_kind, sections, tone, disclaimer, forbidden_expressions, risk_boundary, template_scope)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        body.module || 'bazi',
        body.name,
        body.report_kind || 'life',
        body.sections || [],
        body.tone || '亲民、克制、可解释',
        body.disclaimer || '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。',
        body.forbidden_expressions || ['一定', '必定', '保证'],
        body.risk_boundary || '',
        body.template_scope || {},
      ],
    );
    res.status(201).json({ template: result.rows[0] });
  });

  app.patch('/destiny-api/admin/templates/:id', async (req, res) => {
    if (!pool) {
      const template = memory.templates.find((item) => item.id === req.params.id);
      Object.assign(template, req.body || {});
      res.json({ template });
      return;
    }
    const body = req.body || {};
    const result = await pool.query(
      `
        update app.report_templates
        set name = coalesce($2, name),
            report_kind = coalesce($3, report_kind),
            sections = coalesce($4, sections),
            tone = coalesce($5, tone),
            disclaimer = coalesce($6, disclaimer),
            forbidden_expressions = coalesce($7, forbidden_expressions),
            risk_boundary = coalesce($8, risk_boundary),
            template_scope = coalesce($9, template_scope),
            updated_at = now()
        where id = $1
        returning *
      `,
      [req.params.id, body.name, body.report_kind, body.sections, body.tone, body.disclaimer, body.forbidden_expressions, body.risk_boundary, body.template_scope],
    );
    res.json({ template: result.rows[0] });
  });

  app.post('/destiny-api/admin/templates/:id/publish', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const template = memory.templates.find((item) => item.id === req.params.id);
      if (template) template.status = 'published';
      res.json({ template });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await publishItem(client, {
        type: 'template',
        id: req.params.id,
        actorUserId: req.session?.user_id,
        changeSummary: req.body?.changeSummary,
      });
      await publishingGraphSync?.syncPublishedItem('template', result.item);
      await client.query('commit');
      res.json(result);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/templates/:id/disable', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const template = memory.templates.find((item) => item.id === req.params.id);
      if (template) template.status = 'disabled';
      res.json({ template });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await disableItem(client, {
        type: 'template',
        id: req.params.id,
        actorUserId: req.session?.user_id,
        changeSummary: req.body?.changeSummary,
      });
      await client.query('commit');
      res.json(result);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/templates/:id/preview', async (req, res) => {
    if (!pool) {
      const template = memory.templates.find((item) => item.id === req.params.id) || req.body;
      res.json({ preview: { title: template.name || '预览报告', sections: template.sections || [] } });
      return;
    }
    const result = await pool.query('select * from app.report_templates where id = $1', [req.params.id]);
    const template = result.rows[0] || req.body || {};
    res.json({ preview: { title: template.name || '预览报告', sections: template.sections || [] } });
  });
}
