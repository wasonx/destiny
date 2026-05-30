import { disableItem, publishItem } from '../content/publishing-service.mjs';
import { requirePlatformAdmin } from '../middleware/roles.mjs';
import { memory, nextId } from './memory-state.mjs';

export function mountKnowledgeRoutes(app, { pool, publishingGraphSync = null }) {
  app.get('/destiny-api/admin/knowledge', async (req, res) => {
    if (!pool) {
      const status = req.query.status;
      res.json({ entries: status ? memory.knowledgeEntries.filter((item) => item.status === status) : memory.knowledgeEntries });
      return;
    }
    const status = req.query.status;
    const result = await pool.query(
      `
        select *
        from app.knowledge_entries
        where ($1::text is null or status = $1)
        order by updated_at desc
        limit 100
      `,
      [status || null],
    );
    res.json({ entries: result.rows });
  });

  app.post('/destiny-api/admin/knowledge', async (req, res) => {
    const body = req.body || {};
    if (!pool) {
      const entry = { id: nextId('knowledge'), status: 'draft', module: 'bazi', tags: [], ...body };
      memory.knowledgeEntries.unshift(entry);
      res.status(201).json({ entry });
      return;
    }
    const result = await pool.query(
      `
        insert into app.knowledge_entries(module, title, summary, body, tags, risk_note, applicable_scope, concept_keys, source_note)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [body.module || 'bazi', body.title, body.summary || '', body.body || '', body.tags || [], body.risk_note || '', body.applicable_scope || {}, body.concept_keys || [], body.source_note || ''],
    );
    res.status(201).json({ entry: result.rows[0] });
  });

  app.patch('/destiny-api/admin/knowledge/:id', async (req, res) => {
    if (!pool) {
      const entry = memory.knowledgeEntries.find((item) => item.id === req.params.id);
      Object.assign(entry, req.body || {});
      res.json({ entry });
      return;
    }
    const result = await pool.query(
      `
        update app.knowledge_entries
        set title = coalesce($2, title),
            summary = coalesce($3, summary),
            body = coalesce($4, body),
            tags = coalesce($5, tags),
            risk_note = coalesce($6, risk_note),
            applicable_scope = coalesce($7, applicable_scope),
            concept_keys = coalesce($8, concept_keys),
            source_note = coalesce($9, source_note),
            updated_at = now()
        where id = $1
        returning *
      `,
      [req.params.id, req.body.title, req.body.summary, req.body.body, req.body.tags, req.body.risk_note, req.body.applicable_scope, req.body.concept_keys, req.body.source_note],
    );
    res.json({ entry: result.rows[0] });
  });

  app.post('/destiny-api/admin/knowledge/:id/publish', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const entry = memory.knowledgeEntries.find((item) => item.id === req.params.id);
      if (entry) entry.status = 'published';
      res.json({ entry });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await publishItem(client, {
        type: 'knowledge',
        id: req.params.id,
        actorUserId: req.session?.user_id,
        changeSummary: req.body?.changeSummary,
      });
      await publishingGraphSync?.syncPublishedItem('knowledge', result.item);
      await client.query('commit');
      res.json(result);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/knowledge/:id/disable', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      const entry = memory.knowledgeEntries.find((item) => item.id === req.params.id);
      if (entry) entry.status = 'disabled';
      res.json({ entry });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await disableItem(client, {
        type: 'knowledge',
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
}
