import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGraphQueryService } from '../graph/graph-query-service.mjs';

test('fallback concept graph returns normalized nodes and edges', async () => {
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });
  const graph = await service.getConceptGraph('wood');

  assert.equal(graph.focus.id, 'concept:wood');
  assert.ok(graph.nodes.some((node) => node.id === 'concept:wood'));
  assert.ok(graph.edges.some((edge) => edge.type === 'GENERATES'));
  assert.ok(graph.edges.every((edge) => edge.source && edge.target));
});

test('knowledge graph links knowledge to concepts from PostgreSQL fields', async () => {
  const pool = {
    async query(sql, params = []) {
      assert.match(sql, /from app\.knowledge_entries/i);
      assert.deepEqual(params, ['knowledge-1']);
      return { rows: [{ id: 'knowledge-1', title: '五行偏旺', concept_keys: ['wood'], tags: ['五行'], source_note: '内部整理' }] };
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getKnowledgeGraph('knowledge-1', { pool });

  assert.equal(graph.focus.id, 'knowledge:knowledge-1');
  assert.ok(graph.nodes.some((node) => node.type === 'Knowledge'));
  assert.ok(graph.nodes.some((node) => node.id === 'concept:wood'));
  assert.ok(graph.edges.some((edge) => edge.type === 'EXPLAINS'));
});

test('rule graph links rules to knowledge and concept nodes', async () => {
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('from app.analysis_rules')) {
        assert.deepEqual(params, ['rule-1']);
        return {
          rows: [
            {
              id: 'rule-1',
              name: '木旺规则',
              knowledge_entry_ids: ['knowledge-1'],
              graph_node_keys: ['wood'],
              risk_boundary: '避免绝对化',
            },
          ],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getRuleGraph('rule-1', { pool });

  assert.equal(graph.focus.id, 'rule:rule-1');
  assert.ok(graph.nodes.some((node) => node.id === 'knowledge:knowledge-1'));
  assert.ok(graph.nodes.some((node) => node.id === 'concept:wood'));
  assert.ok(graph.edges.some((edge) => edge.type === 'USES'));
  assert.ok(graph.edges.some((edge) => edge.type === 'REFERENCES_CONCEPT'));
});

test('template graph exposes risk boundary and scoped rule nodes', async () => {
  const pool = {
    async query(sql, params = []) {
      assert.match(sql, /from app\.report_templates/i);
      assert.deepEqual(params, ['template-1']);
      return {
        rows: [
          {
            id: 'template-1',
            name: '完整报告模板',
            report_kind: 'life',
            risk_boundary: '不做医疗投资承诺',
            template_scope: { rule_ids: ['rule-1'] },
          },
        ],
      };
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getTemplateGraph('template-1', { pool });

  assert.equal(graph.focus.id, 'template:template-1');
  assert.ok(graph.nodes.some((node) => node.type === 'RiskBoundary'));
  assert.ok(graph.nodes.some((node) => node.id === 'rule:rule-1'));
  assert.ok(graph.edges.some((edge) => edge.type === 'USES_RISK_BOUNDARY'));
});

test('report graph returns stored provenance graph and report focus', async () => {
  const pool = {
    async query(sql, params = []) {
      assert.match(sql, /from app\.report_provenance_records/i);
      assert.deepEqual(params, ['report-1']);
      return {
        rows: [
          {
            graph_nodes: [{ id: 'concept:wood', type: 'Concept', label: '木', metadata: {} }],
            graph_edges: [],
            rule_hits: [{ id: 'rule-1', name: '木旺规则' }],
            knowledge_sources: [{ id: 'knowledge-1', title: '五行偏旺' }],
            template_snapshot: { id: 'template-1', name: '完整报告模板' },
          },
        ],
      };
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getReportGraph('report-1', { pool });

  assert.equal(graph.focus.id, 'report:report-1');
  assert.ok(graph.nodes.some((node) => node.id === 'concept:wood'));
  assert.ok(graph.nodes.some((node) => node.id === 'rule:rule-1'));
  assert.ok(graph.nodes.some((node) => node.id === 'knowledge:knowledge-1'));
  assert.ok(graph.nodes.some((node) => node.id === 'template:template-1'));
});
