import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function createGraphRoutePool() {
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'admin', user_id: 'admin-1', status: 'active', display_name: '管理员' }] };
      }
      if (sql.includes('from app.knowledge_entries')) {
        assert.deepEqual(params, ['knowledge-1']);
        return { rows: [{ id: 'knowledge-1', title: '五行偏旺', concept_keys: ['wood'], tags: ['五行'], source_note: '内部整理' }] };
      }
      if (sql.includes('from app.analysis_rules')) {
        assert.deepEqual(params, ['rule-1']);
        return { rows: [{ id: 'rule-1', name: '木旺规则', knowledge_entry_ids: ['knowledge-1'], graph_node_keys: ['wood'], risk_boundary: '避免绝对化' }] };
      }
      if (sql.includes('from app.report_templates')) {
        assert.deepEqual(params, ['template-1']);
        return { rows: [{ id: 'template-1', name: '完整报告模板', report_kind: 'life', risk_boundary: '仅供参考', template_scope: { rule_ids: ['rule-1'] } }] };
      }
      if (sql.includes('from app.report_provenance_records')) {
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
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  return pool;
}

test('admin graph routes return normalized nodes and edges', async () => {
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool: createGraphRoutePool() });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const path of [
      '/destiny-api/admin/graph/concepts/wood/paths',
      '/destiny-api/admin/graph/knowledge/knowledge-1',
      '/destiny-api/admin/graph/rules/rule-1',
      '/destiny-api/admin/graph/templates/template-1',
      '/destiny-api/admin/graph/reports/report-1',
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        headers: { Authorization: 'Bearer admin-token' },
      });
      const data = await response.json();

      assert.equal(response.status, 200, path);
      assert.ok(data.focus?.id, path);
      assert.ok(Array.isArray(data.nodes), path);
      assert.ok(Array.isArray(data.edges), path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concept graph route allows Neo4j-only concept keys when graph driver is configured', async () => {
  let queriedKey = '';
  const graphDriver = {
    session(options) {
      assert.deepEqual(options, { database: 'neo4j' });
      return {
        async run(cypher, params = {}) {
          queriedKey = params.key || '';
          if (cypher.includes('return 1')) {
            return { records: [] };
          }
          return {
            records: [
              {
                get(name) {
                  if (name === 'focus') {
                    return {
                      labels: ['Concept'],
                      properties: { key: 'custom.node', label: '自定义节点', type: '自定义概念' },
                      elementId: 'custom-node',
                    };
                  }
                  if (name === 'paths') {
                    return [];
                  }
                  throw new Error(`Unexpected field: ${name}`);
                },
              },
            ],
          };
        },
        async close() {},
      };
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), graphDriver });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/graph/concepts/custom.node/paths`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(queriedKey, 'custom.node');
    assert.equal(data.focus.id, 'concept:custom.node');
    assert.equal(data.focus.label, '自定义节点');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
