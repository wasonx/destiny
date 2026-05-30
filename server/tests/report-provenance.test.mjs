import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildReportProvenance, saveReportProvenance } from '../graph/report-provenance-service.mjs';

test('report provenance migration adds provenance storage', () => {
  const sql = readFileSync(new URL('../db/migrations/009_phase9_report_provenance.sql', import.meta.url), 'utf8');

  assert.match(sql, /alter table app\.report_runs/i);
  assert.match(sql, /add column if not exists provenance jsonb/i);
  assert.match(sql, /create table if not exists app\.report_provenance_records/i);
  assert.match(sql, /graph_nodes jsonb/i);
  assert.match(sql, /graph_edges jsonb/i);
  assert.match(sql, /rule_hits jsonb/i);
  assert.match(sql, /knowledge_sources jsonb/i);
});

test('buildReportProvenance extracts graph nodes edges and published sources', () => {
  const provenance = buildReportProvenance({
    graph: { nodes: [{ id: 'concept:wood' }], edges: [{ id: 'a->b' }] },
    context: {
      rules: [{ id: 'rule-1', version_no: 1 }],
      knowledge: [{ id: 'knowledge-1', version_no: 2 }],
      template: { id: 'template-1', version_no: 3 },
    },
    safety: { passed: true, flags: [] },
  });

  assert.equal(provenance.graphNodes.length, 1);
  assert.equal(provenance.graphEdges.length, 1);
  assert.equal(provenance.ruleHits[0].id, 'rule-1');
  assert.equal(provenance.knowledgeSources[0].id, 'knowledge-1');
  assert.equal(provenance.templateSnapshot.id, 'template-1');
  assert.equal(provenance.safetySnapshot.passed, true);
});

test('buildReportProvenance derives graph paths from report context', () => {
  const provenance = buildReportProvenance({
    context: {
      rules: [
        {
          id: 'rule-1',
          name: '木旺提醒',
          version_no: 3,
          knowledge_entry_ids: ['knowledge-1'],
          graph_node_keys: ['wood'],
          risk_boundary: '避免绝对化判断',
        },
      ],
      knowledge: [
        {
          id: 'knowledge-1',
          title: '木气解释',
          version_no: 2,
          concept_keys: ['wood'],
        },
      ],
      template: {
        id: 'template-1',
        name: '照见模板',
        version_no: 4,
        template_scope: { rule_ids: ['rule-1'] },
        risk_boundary: '仅作参考',
      },
    },
    safety: { passed: true },
  });

  assert.ok(provenance.graphNodes.some((node) => node.id === 'rule:rule-1' && node.type === 'Rule'));
  assert.ok(provenance.graphNodes.some((node) => node.id === 'knowledge:knowledge-1' && node.type === 'Knowledge'));
  assert.ok(provenance.graphNodes.some((node) => node.id === 'concept:wood' && node.type === 'Concept'));
  assert.ok(provenance.graphNodes.some((node) => node.id === 'template:template-1' && node.type === 'Template'));
  assert.ok(provenance.graphEdges.some((edge) => edge.source === 'rule:rule-1' && edge.target === 'knowledge:knowledge-1' && edge.type === 'USES'));
  assert.ok(provenance.graphEdges.some((edge) => edge.source === 'knowledge:knowledge-1' && edge.target === 'concept:wood' && edge.type === 'EXPLAINS'));
  assert.ok(provenance.graphEdges.some((edge) => edge.source === 'template:template-1' && edge.target === 'rule:rule-1' && edge.type === 'TRIGGERS'));
});

test('saveReportProvenance inserts detail row and updates report run summary', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (normalized.includes('insert into app.report_provenance_records')) return { rows: [], rowCount: 1 };
      if (normalized.includes('update app.report_runs set provenance')) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query: ${normalized}`);
    },
  };
  const provenance = buildReportProvenance({
    graph: { nodes: [{ id: 'concept:wood' }], edges: [] },
    context: { rules: [], knowledge: [], template: null },
    safety: { passed: true },
  });

  await saveReportProvenance(client, { reportRunId: 'report-1', provenance });

  assert.ok(queries.some((query) => query.sql.includes('insert into app.report_provenance_records')));
  assert.ok(queries.some((query) => query.sql.includes('update app.report_runs set provenance')));
});
