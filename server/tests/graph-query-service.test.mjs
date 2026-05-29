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
