import { disableItem, publishItem } from '../content/publishing-service.mjs';
import { requirePlatformAdmin } from '../middleware/roles.mjs';
import { runRules } from '../rules/rule-engine.mjs';
import { memory, nextId } from './memory-state.mjs';

export function mountRuleRoutes(app, { pool, publishingGraphSync = null } = {}) {
  app.get('/destiny-api/admin/rules', async (req, res) => {
    if (!pool) {
      const status = req.query.status;
      res.json({ rules: status ? memory.rules.filter((item) => item.status === status) : memory.rules });
      return;
    }
    const status = req.query.status;
    const result = await pool.query(
      `
        select *
        from app.analysis_rules
        where ($1::text is null or status = $1)
        order by priority asc, weight desc, updated_at desc
        limit 100
      `,
      [status || null],
    );
    res.json({ rules: result.rows });
  });

  app.post('/destiny-api/admin/rules', async (req, res) => {
    const body = req.body || {};
    if (!pool) {
      const rule = { id: nextId('rule'), status: 'draft', priority: 100, weight: 0, ...body };
      memory.rules.unshift(rule);
      res.status(201).json({ rule });
      return;
    }
    const result = await pool.query(
      `
        insert into app.analysis_rules(module, name, priority, weight, condition, conclusion, advice, risk_boundary, knowledge_entry_ids, graph_node_keys, trigger_explanation)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        returning *
      `,
      [
        body.module || 'bazi',
        body.name,
        body.priority || 100,
        body.weight || 0,
        body.condition || {},
        body.conclusion || '',
        body.advice || '',
        body.risk_boundary || '',
        body.knowledge_entry_ids || [],
        body.graph_node_keys || [],
        body.trigger_explanation || '',
      ],
    );
    res.status(201).json({ rule: result.rows[0] });
  });

  app.patch('/destiny-api/admin/rules/:id', async (req, res) => {
    if (!pool) {
      const rule = memory.rules.find((item) => item.id === req.params.id);
      Object.assign(rule, req.body || {});
      res.json({ rule });
      return;
    }
    const body = req.body || {};
    const result = await pool.query(
      `
        update app.analysis_rules
        set name = coalesce($2, name),
            priority = coalesce($3, priority),
            weight = coalesce($4, weight),
            condition = coalesce($5, condition),
            conclusion = coalesce($6, conclusion),
            advice = coalesce($7, advice),
            risk_boundary = coalesce($8, risk_boundary),
            knowledge_entry_ids = coalesce($9, knowledge_entry_ids),
            graph_node_keys = coalesce($10, graph_node_keys),
            trigger_explanation = coalesce($11, trigger_explanation),
            updated_at = now()
        where id = $1
        returning *
      `,
      [req.params.id, body.name, body.priority, body.weight, body.condition, body.conclusion, body.advice, body.risk_boundary, body.knowledge_entry_ids, body.graph_node_keys, body.trigger_explanation],
    );
    res.json({ rule: result.rows[0] });
  });

  app.post('/destiny-api/admin/rules/:id/publish', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const rule = memory.rules.find((item) => item.id === req.params.id);
      if (rule) rule.status = 'published';
      res.json({ rule });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await publishItem(client, {
        type: 'rule',
        id: req.params.id,
        actorUserId: req.session?.user_id,
        changeSummary: req.body?.changeSummary,
      });
      await publishingGraphSync?.syncPublishedItem('rule', result.item);
      await client.query('commit');
      res.json(result);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/rules/:id/disable', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const rule = memory.rules.find((item) => item.id === req.params.id);
      if (rule) rule.status = 'disabled';
      res.json({ rule });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await disableItem(client, {
        type: 'rule',
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

  app.post('/destiny-api/admin/rules/test', (req, res) => {
    res.json({ hits: runRules(req.body?.rules || memory.rules, req.body?.facts || {}) });
  });
}
