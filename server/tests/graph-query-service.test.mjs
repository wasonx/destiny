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

test('fallback concept graph can be limited by one-hop depth', async () => {
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });
  const oneHop = await service.getConceptGraph('wood', { depth: 1 });
  const twoHop = await service.getConceptGraph('wood', { depth: 2 });

  assert.ok(twoHop.nodes.length >= oneHop.nodes.length);
  assert.ok(oneHop.edges.every((edge) => edge.source === 'concept:wood' || edge.target === 'concept:wood'));
});

test('concept graph queries Neo4j driver when configured', async () => {
  const wood = {
    labels: ['Concept'],
    properties: { key: 'wood', label: '木', type: '五行', element: '木', yinYang: '阳' },
    elementId: 'wood-node',
  };
  const fire = {
    labels: ['Concept'],
    properties: { key: 'fire', label: '火', type: '五行', element: '火', yinYang: '阳' },
    elementId: 'fire-node',
  };
  const calls = [];
  let sessionOptions = null;
  let sessionClosed = false;
  const graphDriver = {
    session(options) {
      sessionOptions = options;
      return {
        async run(cypher, params) {
          calls.push({ cypher, params });
          return {
            records: [
              {
                get(name) {
                  if (name === 'focus') return wood;
                  if (name === 'paths') {
                    return [
                      {
                        segments: [
                          {
                            start: wood,
                            relationship: { type: 'GENERATES', properties: { source: 'seed' } },
                            end: fire,
                          },
                        ],
                      },
                    ];
                  }
                  throw new Error(`Unexpected field: ${name}`);
                },
              },
            ],
          };
        },
        async close() {
          sessionClosed = true;
        },
      };
    },
  };
  const service = createGraphQueryService({ graphDriver, database: 'zhensuan' });

  const graph = await service.getConceptGraph('wood', { depth: 1 });

  assert.deepEqual(sessionOptions, { database: 'zhensuan' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].cypher, /focus:Concept/);
  assert.deepEqual(calls[0].params, { key: 'wood' });
  assert.equal(sessionClosed, true);
  assert.equal(graph.focus.id, 'concept:wood');
  assert.ok(graph.nodes.some((node) => node.id === 'concept:fire' && node.metadata.source === 'neo4j'));
  assert.ok(graph.edges.some((edge) => edge.source === 'concept:wood' && edge.target === 'concept:fire' && edge.type === 'GENERATES'));
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

test('knowledge graph exposes source notes as source nodes', async () => {
  const pool = {
    async query(sql, params = []) {
      assert.match(sql, /from app\.knowledge_entries/i);
      assert.deepEqual(params, ['knowledge-source-1']);
      return {
        rows: [
          {
            id: 'knowledge-source-1',
            title: '五行来源条目',
            concept_keys: ['wood'],
            tags: ['五行'],
            source_note: '《滴天髓》整理',
          },
        ],
      };
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getKnowledgeGraph('knowledge-source-1', { pool });

  assert.ok(graph.nodes.some((node) => node.id === 'source:knowledge-source-1' && node.type === 'Source'));
  assert.ok(graph.edges.some((edge) => edge.source === 'knowledge:knowledge-source-1' && edge.target === 'source:knowledge-source-1' && edge.type === 'HAS_SOURCE'));
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
      if (sql.includes('from app.knowledge_entries')) {
        assert.deepEqual(params, ['knowledge-1']);
        return { rows: [{ id: 'knowledge-1', title: '五行偏旺', concept_keys: [], tags: [], source_note: '' }] };
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

test('rule graph expands cited knowledge into concepts and sources', async () => {
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('from app.analysis_rules')) {
        assert.deepEqual(params, ['rule-expand-1']);
        return {
          rows: [
            {
              id: 'rule-expand-1',
              name: '引用知识规则',
              knowledge_entry_ids: ['knowledge-expand-1'],
              graph_node_keys: [],
              risk_boundary: '',
            },
          ],
        };
      }
      if (sql.includes('from app.knowledge_entries')) {
        assert.deepEqual(params, ['knowledge-expand-1']);
        return {
          rows: [
            {
              id: 'knowledge-expand-1',
              title: '木旺知识',
              concept_keys: ['wood'],
              tags: ['五行'],
              source_note: '内部知识库整理',
            },
          ],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const service = createGraphQueryService({ graphDriver: null, database: 'neo4j' });

  const graph = await service.getRuleGraph('rule-expand-1', { pool });

  assert.ok(graph.nodes.some((node) => node.id === 'knowledge:knowledge-expand-1' && node.label === '木旺知识'));
  assert.ok(graph.nodes.some((node) => node.id === 'concept:wood'));
  assert.ok(graph.nodes.some((node) => node.id === 'source:knowledge-expand-1'));
  assert.ok(graph.edges.some((edge) => edge.source === 'rule:rule-expand-1' && edge.target === 'knowledge:knowledge-expand-1' && edge.type === 'USES'));
  assert.ok(graph.edges.some((edge) => edge.source === 'knowledge:knowledge-expand-1' && edge.target === 'concept:wood' && edge.type === 'EXPLAINS'));
  assert.ok(graph.edges.some((edge) => edge.source === 'knowledge:knowledge-expand-1' && edge.target === 'source:knowledge-expand-1' && edge.type === 'HAS_SOURCE'));
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
