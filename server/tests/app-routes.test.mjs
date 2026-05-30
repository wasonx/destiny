import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function publishedContentRows(sql) {
  if (sql.includes('from app.knowledge_entries')) {
    return { rows: [] };
  }
  if (sql.includes('from app.analysis_rules')) {
    return { rows: [] };
  }
  if (sql.includes('from app.report_templates')) {
    return { rows: [] };
  }
  return null;
}

test('health route returns configured model state', async () => {
  const app = createApp({ config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'deepseek-chat' }) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      model: 'deepseek-chat',
      hasKey: false,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin route modules are mounted', async () => {
  const app = createApp({ config: loadConfig({}) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/ops/health`);
    assert.notEqual(response.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route fills missing ai report fields from fallback structure', async () => {
  const aiServer = await new Promise((resolve) => {
    const server = createApp({
      config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'mock' }),
    }).listen(0, () => resolve(server));
  });
  const aiPort = aiServer.address().port;
  aiServer.removeAllListeners('request');
  aiServer.on('request', (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'AI 摘要' }) } }] }));
  });

  const app = createApp({
    config: loadConfig({
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'mock',
      DEEPSEEK_API_URL: `http://127.0.0.1:${aiPort}`,
    }),
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'space', payload: { focus: '房屋朝向' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.title, '安居 · 环境分析');
    assert.equal(data.report.summary, 'AI 摘要');
    assert.ok(Array.isArray(data.report.sections));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => aiServer.close(resolve));
  }
});

test('generate route sends published knowledge and graph context to ai and provenance', async () => {
  const aiRequests = [];
  const aiServer = await new Promise((resolve) => {
    const server = createApp({
      config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'mock' }),
    }).listen(0, () => resolve(server));
  });
  const aiPort = aiServer.address().port;
  aiServer.removeAllListeners('request');
  aiServer.on('request', (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      aiRequests.push(JSON.parse(body));
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'AI graph summary' }) } }] }));
    });
  });

  const knowledge = {
    id: 'knowledge-graph-1',
    title: 'Wood balance knowledge',
    module: 'bazi',
    status: 'published',
    concept_keys: ['wood'],
    tags: ['element'],
    source_note: 'internal source note',
  };
  const rule = {
    id: 'rule-graph-1',
    name: 'Wood graph rule',
    module: 'bazi',
    status: 'published',
    knowledge_entry_ids: ['knowledge-graph-1'],
    graph_node_keys: ['wood'],
    condition: { field: 'focus', operator: 'eq', value: 'career' },
    risk_boundary: 'reference only',
  };
  const template = {
    id: 'template-graph-1',
    name: 'Graph report template',
    module: 'bazi',
    report_kind: 'life',
    status: 'published',
    template_scope: { rule_ids: ['rule-graph-1'] },
    risk_boundary: 'no absolute claims',
  };
  const storedContexts = [];
  const storedProvenances = [];
  const client = {
    async query(sql, params = []) {
      if (sql.includes('from app.knowledge_entries') && sql.includes("status = 'published'")) {
        return { rows: [knowledge] };
      }
      if (sql.includes('from app.analysis_rules') && sql.includes("status = 'published'")) {
        return { rows: [rule] };
      }
      if (sql.includes('from app.report_templates') && sql.includes("status = 'published'")) {
        return { rows: [template] };
      }
      if (sql.includes('from app.report_templates') && sql.includes('id = $1')) {
        assert.deepEqual(params, ['template-graph-1']);
        return { rows: [template] };
      }
      if (sql.includes('from app.analysis_rules') && sql.includes('id = $1')) {
        assert.deepEqual(params, ['rule-graph-1']);
        return { rows: [rule] };
      }
      if (sql.includes('from app.knowledge_entries') && sql.includes('id = $1')) {
        assert.deepEqual(params, ['knowledge-graph-1']);
        return { rows: [knowledge] };
      }
      if (sql.includes('insert into app.report_runs')) {
        storedContexts.push(params[3]);
        return { rows: [{ id: 'report-run-graph' }], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        storedProvenances.push({ graphNodes: params[1], graphEdges: params[2] });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        storedProvenances.push(params[1]);
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  let graphRunCount = 0;
  const wood = {
    properties: { key: 'wood', label: 'Wood', type: 'FiveElement' },
    elementId: 'wood-node',
  };
  const fire = {
    properties: { key: 'fire', label: 'Fire', type: 'FiveElement' },
    elementId: 'fire-node',
  };
  const graphDriver = {
    session() {
      return {
        async run(_cypher, params) {
          graphRunCount += 1;
          assert.deepEqual(params, { key: 'wood' });
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
                            relationship: { type: 'GENERATES', properties: { source: 'neo4j-test' } },
                            end: fire,
                          },
                        ],
                      },
                    ];
                  }
                  throw new Error(`Unexpected graph field: ${name}`);
                },
              },
            ],
          };
        },
        async close() {},
      };
    },
  };
  const app = createApp({
    config: loadConfig({
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'mock',
      DEEPSEEK_API_URL: `http://127.0.0.1:${aiPort}`,
      NEO4J_DATABASE: 'zhensuan-test',
    }),
    pool,
    graphDriver,
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'life', payload: { focus: 'career' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.summary, 'AI graph summary');
    assert.equal(graphRunCount, 1);
    const prompt = aiRequests[0].messages.map((message) => message.content).join('\n');
    assert.match(prompt, /knowledge-graph-1/);
    assert.match(prompt, /rule-graph-1/);
    assert.match(prompt, /concept:fire/);
    assert.match(prompt, /GENERATES/);
    assert.ok(storedContexts.some((context) => context.graph.nodes.some((node) => node.id === 'concept:fire')));
    assert.ok(storedContexts.some((context) => context.graph.edges.some((edge) => edge.type === 'GENERATES')));
    assert.ok(storedProvenances.some((provenance) => provenance.graphNodes?.some((node) => node.id === 'concept:fire')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => aiServer.close(resolve));
  }
});

test('generate route records only matching published rules and related knowledge', async () => {
  const knowledgeHit = {
    id: 'knowledge-hit',
    title: 'Career knowledge',
    concept_keys: ['wood'],
    source_note: 'career source',
  };
  const knowledgeMiss = {
    id: 'knowledge-miss',
    title: 'Relationship knowledge',
    concept_keys: ['fire'],
    source_note: 'relationship source',
  };
  const ruleHit = {
    id: 'rule-hit',
    name: 'Career rule',
    priority: 10,
    weight: 5,
    condition: { field: 'concern', operator: 'eq', value: 'career' },
    knowledge_entry_ids: ['knowledge-hit'],
    graph_node_keys: ['wood'],
    risk_boundary: 'reference only',
  };
  const ruleMiss = {
    id: 'rule-miss',
    name: 'Relationship rule',
    priority: 1,
    weight: 100,
    condition: { field: 'concern', operator: 'eq', value: 'relationship' },
    knowledge_entry_ids: ['knowledge-miss'],
    graph_node_keys: ['fire'],
    risk_boundary: 'reference only',
  };
  const storedContexts = [];
  const storedProvenances = [];
  const client = {
    async query(sql, params = []) {
      if (sql.includes('from app.knowledge_entries') && sql.includes("status = 'published'")) {
        return { rows: [knowledgeHit, knowledgeMiss] };
      }
      if (sql.includes('from app.analysis_rules') && sql.includes("status = 'published'")) {
        return { rows: [ruleMiss, ruleHit] };
      }
      if (sql.includes('from app.report_templates') && sql.includes("status = 'published'")) {
        return { rows: [] };
      }
      if (sql.includes('from app.analysis_rules') && sql.includes('id = $1')) {
        assert.deepEqual(params, ['rule-hit']);
        return { rows: [ruleHit] };
      }
      if (sql.includes('from app.knowledge_entries') && sql.includes('id = $1')) {
        assert.deepEqual(params, ['knowledge-hit']);
        return { rows: [knowledgeHit] };
      }
      if (sql.includes('insert into app.report_runs')) {
        storedContexts.push(params[3]);
        return { rows: [{ id: 'report-run-rule-hit' }], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        storedProvenances.push({ ruleHits: params[3], knowledgeSources: params[4], graphNodes: params[1] });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        storedProvenances.push(params[1]);
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'life', payload: { concern: 'career' } }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(storedContexts[0].rules.map((rule) => rule.id), ['rule-hit']);
    assert.deepEqual(storedContexts[0].knowledge.map((item) => item.id), ['knowledge-hit']);
    assert.equal(storedContexts[0].features.concern, 'career');
    assert.ok(storedContexts[0].graph.nodes.some((node) => node.id === 'rule:rule-hit'));
    assert.ok(!storedContexts[0].graph.nodes.some((node) => node.id === 'rule:rule-miss'));
    assert.ok(storedProvenances.some((provenance) => provenance.ruleHits?.every((rule) => rule.id === 'rule-hit')));
    assert.ok(storedProvenances.some((provenance) => provenance.knowledgeSources?.every((item) => item.id === 'knowledge-hit')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route with customer session spends report quota and records customer report run', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('update app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 2 }], rowCount: 1 };
      }
      if (sql.includes('insert into app.entitlement_ledger')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_runs')) {
        return { rows: [{ id: 'report-run-1' }], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', tier: 'full', payload: { focus: '事业' } }),
    });
    assert.equal(response.status, 200);
    assert.ok(queries.some((query) => query.sql.includes('update app.entitlement_accounts') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.report_runs') && query.params[0] === 'customer-1'));
    assert.ok(queries.some((query) => query.sql.includes('insert into app.safety_reviews')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route returns 402 when logged-in customer has no report quota', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('update app.entitlement_accounts')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('insert into app.report_runs')) {
        return { rows: [{ id: 'report-run-no-quota' }], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', tier: 'full', payload: { focus: '事业' } }),
    });
    assert.equal(response.status, 402);
    assert.deepEqual(await response.json(), { error: 'INSUFFICIENT_REPORT_QUOTA' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route defaults to free report without spending customer quota', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('update app.entitlement_accounts')) {
        throw new Error('FREE_TIER_SHOULD_NOT_SPEND_QUOTA');
      }
      if (sql.includes('insert into app.report_runs')) {
        assert.match(sql, /report_tier/);
        assert.equal(params[6], 'free');
        return { rows: [{ id: 'report-run-free' }], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', payload: { focus: '事业' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.tier, 'free');
    assert.equal(data.report.isPreview, true);
    assert.ok(data.report.upgradePrompt);
    assert.ok(!queries.some((query) => query.sql.includes('update app.entitlement_accounts')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('generate route spends quota for full report tier and records it', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      const publishedRows = publishedContentRows(sql);
      if (publishedRows) {
        return publishedRows;
      }
      if (sql.includes('insert into app.report_runs')) {
        assert.match(sql, /report_tier/);
        assert.equal(params[6], 'full');
        return { rows: [{ id: 'report-run-full' }], rowCount: 1 };
      }
      if (sql.includes('update app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 1 }], rowCount: 1 };
      }
      if (sql.includes('insert into app.entitlement_ledger')) {
        assert.equal(params[4], 'report');
        assert.equal(params[5], 'report-run-full');
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.safety_reviews')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('insert into app.report_provenance_records')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('update app.report_runs set provenance')) {
        return { rows: [], rowCount: 1 };
      }
      if (['begin', 'commit', 'rollback'].includes(sql)) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, params = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-token' },
      body: JSON.stringify({ kind: 'life', tier: 'full', payload: { focus: '事业' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.tier, 'full');
    assert.equal(data.report.isPreview, false);
    assert.ok(queries.some((query) => query.sql.includes('update app.entitlement_accounts') && query.params[0] === 'customer-1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('customer value state route reads the logged-in customer', async () => {
  const seenParams = [];
  const pool = {
    async query(sql, params = []) {
      seenParams.push(params);
      if (sql.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: 'customer', user_id: 'customer-1', status: 'active', display_name: '客户' }] };
      }
      if (sql.includes('from app.customer_memberships')) {
        return { rows: [] };
      }
      if (sql.includes('from app.entitlement_accounts')) {
        return { rows: [{ report_quota_balance: 7 }] };
      }
      if (sql.includes('from app.points_accounts')) {
        return { rows: [{ points_balance: 9, lifetime_points: 12, growth_level: '启蒙' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }), pool });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/value-state`, {
      headers: { Authorization: 'Bearer customer-token' },
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.reportQuotaBalance, 7);
    assert.ok(seenParams.some((params) => params[0] === 'customer-1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
