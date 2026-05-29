import { memory, nextId } from './memory-state.mjs';

export function mountKnowledgeRoutes(app, { pool }) {
  app.get('/destiny-api/admin/knowledge', async (req, res) => {
    if (!pool) {
      const status = req.query.status;
      res.json({ entries: status ? memory.knowledgeEntries.filter((item) => item.status === status) : memory.knowledgeEntries });
      return;
    }
    const result = await pool.query('select * from app.knowledge_entries order by updated_at desc limit 100');
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
        insert into app.knowledge_entries(module, title, summary, body, tags, risk_note)
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [body.module || 'bazi', body.title, body.summary || '', body.body || '', body.tags || [], body.risk_note || ''],
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
        set title = coalesce($2, title), summary = coalesce($3, summary), body = coalesce($4, body), tags = coalesce($5, tags), risk_note = coalesce($6, risk_note), updated_at = now()
        where id = $1
        returning *
      `,
      [req.params.id, req.body.title, req.body.summary, req.body.body, req.body.tags, req.body.risk_note],
    );
    res.json({ entry: result.rows[0] });
  });

  app.post('/destiny-api/admin/knowledge/:id/publish', async (req, res) => {
    if (!pool) {
      const entry = memory.knowledgeEntries.find((item) => item.id === req.params.id);
      if (entry) entry.status = 'published';
      res.json({ entry });
      return;
    }
    const result = await pool.query("update app.knowledge_entries set status = 'published', published_at = now() where id = $1 returning *", [req.params.id]);
    res.json({ entry: result.rows[0] });
  });

  app.post('/destiny-api/admin/knowledge/:id/disable', async (req, res) => {
    if (!pool) {
      const entry = memory.knowledgeEntries.find((item) => item.id === req.params.id);
      if (entry) entry.status = 'disabled';
      res.json({ entry });
      return;
    }
    const result = await pool.query("update app.knowledge_entries set status = 'disabled' where id = $1 returning *", [req.params.id]);
    res.json({ entry: result.rows[0] });
  });
}
