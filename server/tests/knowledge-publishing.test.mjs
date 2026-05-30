import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { disableItem, publishItem } from '../content/publishing-service.mjs';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

test('publish workflow migration creates version tables and metadata fields', () => {
  const sql = readFileSync(new URL('../db/migrations/008_phase8_publish_workflow.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists app\.analysis_rule_versions/i);
  assert.match(sql, /create table if not exists app\.report_template_versions/i);
  assert.match(sql, /alter table app\.analysis_rules/i);
  assert.match(sql, /alter table app\.report_templates/i);
  assert.match(sql, /change_summary/i);
  assert.match(sql, /version_no/i);
});

function createPublishingClient({ itemType }) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (normalized.includes('select * from app.knowledge_entries')) {
        return {
          rows: [
            {
              id: 'knowledge-1',
              module: 'bazi',
              title: '五行偏旺',
              summary: '',
              body: '正文',
              tags: ['五行'],
              risk_note: '',
              applicable_scope: {},
              concept_keys: ['wood'],
              source_note: '',
              version_no: 1,
            },
          ],
          rowCount: 1,
        };
      }
      if (normalized.includes('select * from app.analysis_rules')) {
        return {
          rows: [
            {
              id: 'rule-1',
              module: 'bazi',
              name: '木旺',
              priority: 10,
              weight: 5,
              condition: {},
              conclusion: '木旺',
              advice: '保持平衡',
              risk_boundary: '',
              knowledge_entry_ids: [],
              graph_node_keys: ['wood'],
              trigger_explanation: '',
              version_no: 1,
            },
          ],
          rowCount: 1,
        };
      }
      if (normalized.includes('select * from app.report_templates')) {
        return {
          rows: [
            {
              id: 'template-1',
              module: 'bazi',
              name: '完整报告',
              report_kind: 'life',
              sections: [],
              tone: '亲民',
              disclaimer: '仅供参考',
              forbidden_expressions: ['一定'],
              risk_boundary: '',
              template_scope: {},
              version_no: 1,
            },
          ],
          rowCount: 1,
        };
      }
      if (normalized.includes('update app.knowledge_entries') || normalized.includes('update app.analysis_rules') || normalized.includes('update app.report_templates')) {
        return { rows: [{ id: `${itemType}-1`, status: normalized.includes("status = 'disabled'") ? 'disabled' : 'published', version_no: 2 }], rowCount: 1 };
      }
      if (normalized.includes('insert into app.knowledge_entry_versions') || normalized.includes('insert into app.analysis_rule_versions') || normalized.includes('insert into app.report_template_versions')) {
        return { rows: [{ version_no: 2, change_summary: params.at(-1) }], rowCount: 1 };
      }
      if (normalized.includes('insert into app.audit_logs')) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${normalized}`);
    },
  };
  return { client, queries };
}

test('publishItem writes a version row and audit log', async () => {
  const { client, queries } = createPublishingClient({ itemType: 'knowledge' });

  const result = await publishItem(client, {
    type: 'knowledge',
    id: 'knowledge-1',
    actorUserId: 'admin-1',
    changeSummary: '发布五行偏旺解释',
  });

  assert.equal(result.item.status, 'published');
  assert.equal(result.version.change_summary, '发布五行偏旺解释');
  assert.ok(queries.some((query) => query.sql.includes('insert into app.knowledge_entry_versions')));
  assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs')));
});

test('disableItem marks content disabled and writes audit log', async () => {
  const { client, queries } = createPublishingClient({ itemType: 'rule' });

  const result = await disableItem(client, {
    type: 'rule',
    id: 'rule-1',
    actorUserId: 'admin-1',
    changeSummary: '规则暂不使用',
  });

  assert.equal(result.item.status, 'disabled');
  assert.ok(queries.some((query) => query.sql.includes("status = 'disabled'")));
  assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs')));
});

function createPublishingRoutePool({ sessionRole = 'admin' } = {}) {
  const queries = [];
  const runQuery = async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    queries.push({ sql: normalized, params });
    if (['begin', 'commit', 'rollback'].includes(normalized)) {
      return { rows: [], rowCount: 0 };
    }
    if (normalized.includes('from app.login_sessions')) {
      return {
        rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: `${sessionRole}-user-1`, status: 'active', display_name: sessionRole === 'admin' ? '管理员' : '编辑' }],
        rowCount: 1,
      };
    }
    if (normalized.includes('select * from app.knowledge_entries')) {
      return { rows: [{ id: 'knowledge-1', module: 'bazi', title: '五行', summary: '', body: '正文', tags: [], risk_note: '', applicable_scope: {}, concept_keys: ['wood'], source_note: '内部整理', version_no: 0 }], rowCount: 1 };
    }
    if (normalized.includes('select * from app.analysis_rules')) {
      return { rows: [{ id: 'rule-1', module: 'bazi', name: '木旺', priority: 10, weight: 5, condition: {}, conclusion: '木旺', advice: '', risk_boundary: '避免绝对化', knowledge_entry_ids: ['knowledge-1'], graph_node_keys: ['wood'], trigger_explanation: '', version_no: 0 }], rowCount: 1 };
    }
    if (normalized.includes('select * from app.report_templates')) {
      return { rows: [{ id: 'template-1', module: 'bazi', name: '完整报告', report_kind: 'life', sections: [], tone: '亲民', disclaimer: '仅供参考', forbidden_expressions: [], risk_boundary: '仅供参考', template_scope: { rule_ids: ['rule-1'] }, version_no: 0 }], rowCount: 1 };
    }
    if (normalized.includes('from app.knowledge_entry_versions')) {
      return { rows: [{ id: 'version-knowledge-2', entry_id: 'knowledge-1', version_no: 2, title: '五行第二版', change_summary: '第二版发布', published_by: 'admin-user-1', published_at: '2026-05-30T10:00:00.000Z' }], rowCount: 1 };
    }
    if (normalized.includes('from app.analysis_rule_versions')) {
      return { rows: [{ id: 'version-rule-2', rule_id: 'rule-1', version_no: 2, name: '木旺第二版', change_summary: '第二版发布', published_by: 'admin-user-1', published_at: '2026-05-30T10:00:00.000Z' }], rowCount: 1 };
    }
    if (normalized.includes('from app.report_template_versions')) {
      return { rows: [{ id: 'version-template-2', template_id: 'template-1', version_no: 2, name: '完整报告第二版', change_summary: '第二版发布', published_by: 'admin-user-1', published_at: '2026-05-30T10:00:00.000Z' }], rowCount: 1 };
    }
    if (normalized.includes('update app.knowledge_entries')) {
      return { rows: [{ id: 'knowledge-1', module: 'bazi', title: '五行', summary: '', body: '正文', tags: [], risk_note: '', applicable_scope: {}, concept_keys: ['wood'], source_note: '内部整理', status: 'published', version_no: 1 }], rowCount: 1 };
    }
    if (normalized.includes('update app.analysis_rules')) {
      return { rows: [{ id: 'rule-1', module: 'bazi', name: '木旺', priority: 10, weight: 5, condition: {}, conclusion: '木旺', advice: '', risk_boundary: '避免绝对化', knowledge_entry_ids: ['knowledge-1'], graph_node_keys: ['wood'], trigger_explanation: '', status: 'published', version_no: 1 }], rowCount: 1 };
    }
    if (normalized.includes('update app.report_templates')) {
      return { rows: [{ id: 'template-1', module: 'bazi', name: '完整报告', report_kind: 'life', sections: [], tone: '亲民', disclaimer: '仅供参考', forbidden_expressions: [], risk_boundary: '仅供参考', template_scope: { rule_ids: ['rule-1'] }, status: 'published', version_no: 1 }], rowCount: 1 };
    }
    if (normalized.includes('insert into app.knowledge_entry_versions')) {
      return { rows: [{ version_no: 1, change_summary: params.at(-1) }], rowCount: 1 };
    }
    if (normalized.includes('insert into app.analysis_rule_versions')) {
      return { rows: [{ version_no: 1, change_summary: params.at(-1) }], rowCount: 1 };
    }
    if (normalized.includes('insert into app.report_template_versions')) {
      return { rows: [{ version_no: 1, change_summary: params.at(-1) }], rowCount: 1 };
    }
    if (normalized.includes('insert into app.audit_logs')) {
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected route query: ${normalized}`);
  };
  const client = {
    query: runQuery,
    release() {},
  };
  return {
    queries,
    pool: {
      query: runQuery,
      async connect() {
        return client;
      },
    },
  };
}

test('admin publish routes write versions and audit logs', async () => {
  const { pool, queries } = createPublishingRoutePool();
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const path of [
      '/destiny-api/admin/knowledge/knowledge-1/publish',
      '/destiny-api/admin/rules/rule-1/publish',
      '/destiny-api/admin/templates/template-1/publish',
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeSummary: '发布到线上' }),
      });

      assert.equal(response.status, 200);
    }

    assert.ok(queries.some((query) => query.sql.includes('insert into app.knowledge_entry_versions')));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.analysis_rule_versions')));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.report_template_versions')));
    assert.ok(queries.filter((query) => query.sql.includes('insert into app.audit_logs')).length >= 3);
    assert.ok(queries.some((query) => query.params.includes('admin-user-1')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin version routes return publishing version history', async () => {
  const { pool, queries } = createPublishingRoutePool();
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const [path, key, table] of [
      ['/destiny-api/admin/knowledge/knowledge-1/versions', 'versions', 'app.knowledge_entry_versions'],
      ['/destiny-api/admin/rules/rule-1/versions', 'versions', 'app.analysis_rule_versions'],
      ['/destiny-api/admin/templates/template-1/versions', 'versions', 'app.report_template_versions'],
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        headers: { Authorization: 'Bearer admin-token' },
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body[key][0].version_no, 2);
      assert.equal(body[key][0].change_summary, '第二版发布');
      assert.ok(queries.some((query) => query.sql.includes(`from ${table}`)));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('editor sessions cannot publish or disable knowledge rules and templates', async () => {
  const { pool, queries } = createPublishingRoutePool({ sessionRole: 'editor' });
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const path of [
      '/destiny-api/admin/knowledge/knowledge-1/publish',
      '/destiny-api/admin/knowledge/knowledge-1/disable',
      '/destiny-api/admin/rules/rule-1/publish',
      '/destiny-api/admin/rules/rule-1/disable',
      '/destiny-api/admin/templates/template-1/publish',
      '/destiny-api/admin/templates/template-1/disable',
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer editor-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeSummary: '编辑尝试发布' }),
      });

      assert.equal(response.status, 403);
    }

    assert.ok(!queries.some((query) => query.sql.includes("status = 'published'")));
    assert.ok(!queries.some((query) => query.sql.includes("status = 'disabled'")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin publish routes sync published graph facts to Neo4j when configured', async () => {
  const { pool } = createPublishingRoutePool();
  const graphRuns = [];
  const sessionOptions = [];
  const graphDriver = {
    session(options) {
      sessionOptions.push(options);
      return {
        async run(cypher, params = {}) {
          graphRuns.push({ cypher, params });
          return { records: [] };
        },
        async close() {},
      };
    },
  };
  const app = createApp({
    config: loadConfig({ SESSION_SECRET: 'test-secret', NEO4J_DATABASE: 'zhensuan' }),
    pool,
    graphDriver,
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    for (const path of [
      '/destiny-api/admin/knowledge/knowledge-1/publish',
      '/destiny-api/admin/rules/rule-1/publish',
      '/destiny-api/admin/templates/template-1/publish',
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeSummary: '发布到线上并同步图谱' }),
      });

      assert.equal(response.status, 200);
    }

    assert.ok(sessionOptions.every((options) => options.database === 'zhensuan'));
    assert.ok(graphRuns.some((run) => run.cypher.includes('Knowledge') && run.cypher.includes('EXPLAINS') && run.params.id === 'knowledge-1' && run.params.conceptKeys.includes('wood')));
    assert.ok(graphRuns.some((run) => run.cypher.includes('Rule') && run.cypher.includes('USES') && run.cypher.includes('REFERENCES_CONCEPT') && run.params.id === 'rule-1' && run.params.knowledgeEntryIds.includes('knowledge-1')));
    assert.ok(graphRuns.some((run) => run.cypher.includes('Template') && run.cypher.includes('TRIGGERS') && run.params.id === 'template-1' && run.params.ruleIds.includes('rule-1')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
