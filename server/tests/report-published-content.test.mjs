import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPublishedReportContent } from '../content/published-content-service.mjs';
import { buildReportContext } from '../reports/context-builder.mjs';

test('published content loader queries only published records', async () => {
  const queries = [];
  const pool = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (normalized.includes('from app.knowledge_entries')) return { rows: [{ id: 'knowledge-1', status: 'published' }] };
      if (normalized.includes('from app.analysis_rules')) return { rows: [{ id: 'rule-1', status: 'published' }] };
      if (normalized.includes('from app.report_templates')) return { rows: [{ id: 'template-1', status: 'published' }] };
      throw new Error(`Unexpected query: ${normalized}`);
    },
  };

  const content = await loadPublishedReportContent(pool, { reportKind: 'life', module: 'bazi' });

  assert.equal(content.knowledge[0].status, 'published');
  assert.equal(content.rules[0].status, 'published');
  assert.equal(content.template.status, 'published');
  assert.ok(queries.every((query) => query.sql.includes("status = 'published'")));
});

test('report context keeps published content provenance fields', () => {
  const context = buildReportContext({
    input: { kind: 'life' },
    features: { elements: { 木: 2 } },
    rules: [{ id: 'rule-1', version_no: 3 }],
    knowledge: [{ id: 'knowledge-1', version_no: 2 }],
    template: { id: 'template-1', version_no: 4 },
  });

  assert.equal(context.rules[0].version_no, 3);
  assert.equal(context.knowledge[0].version_no, 2);
  assert.equal(context.template.version_no, 4);
});
