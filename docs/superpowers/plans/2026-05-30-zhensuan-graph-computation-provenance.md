# 甄好算图计算与报告溯源 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Neo4j-backed graph computation and report provenance available to the backend so reports can explain which concepts, rules, knowledge entries, templates, and graph paths shaped the result.

**Architecture:** Add a normalized graph service that returns `{ nodes, edges, focus }` payloads for concept, knowledge, rule, template, and report views. Store report provenance in PostgreSQL as structured JSON linked to `report_runs`, while Neo4j remains the relationship query engine and seed fallback remains available when Neo4j is not configured. Admin graph routes expose these payloads for the later visualization phase.

**Tech Stack:** Node.js, Express, PostgreSQL migrations, Neo4j driver, Node test runner, existing report generation route.

---

## Source References

- Scope: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- Roadmap: `docs/superpowers/plans/2026-05-30-zhensuan-1.0-implementation-roadmap.md`
- Current graph routes: `server/routes/graph-routes.mjs`
- Current seed data: `server/graph/bazi-seed-data.mjs`
- Current report route: `server/routes/report-routes.mjs`
- Current report history: `server/routes/report-history-routes.mjs`

## File Structure

Create:

- `server/db/migrations/009_phase9_report_provenance.sql`: adds `report_runs.provenance` and `app.report_provenance_records`.
- `server/graph/graph-query-service.mjs`: normalized graph query service for concept, knowledge, rule, template, and report views.
- `server/graph/report-provenance-service.mjs`: builds and stores report provenance records.
- `server/tests/graph-query-service.test.mjs`: unit tests for normalized graph payloads and Neo4j/fallback behavior.
- `server/tests/report-provenance.test.mjs`: tests provenance schema, persistence, and report context integration.

Modify:

- `server/routes/graph-routes.mjs`: use `graph-query-service` and add knowledge/rule/template/report graph endpoints.
- `server/routes/report-routes.mjs`: build and store provenance after report generation.
- `server/routes/report-history-routes.mjs`: expose provenance for admin report detail.
- `server/reports/context-builder.mjs`: preserve `graph` and `provenance` fields in report context.
- `server/tests/app-routes.test.mjs`: update fake pool stubs to handle provenance inserts.

Do not modify:

- Payment providers; real WeChat Pay remains excluded.
- SMS provider; real Tencent SMS remains excluded.
- Mini-program code unless a graph/provenance endpoint becomes customer-facing later.
- Admin graph visualization UI; that is Phase 3.

## Graph Payload Contract

All graph endpoints return:

```json
{
  "focus": {
    "id": "concept:wood",
    "type": "Concept",
    "label": "木"
  },
  "nodes": [
    {
      "id": "concept:wood",
      "type": "Concept",
      "label": "木",
      "metadata": {
        "conceptType": "五行"
      }
    }
  ],
  "edges": [
    {
      "id": "concept:wood->concept:fire:GENERATES",
      "source": "concept:wood",
      "target": "concept:fire",
      "type": "GENERATES",
      "label": "相生",
      "metadata": {}
    }
  ]
}
```

Route aliases may continue returning `relationships` for backwards compatibility, but new code should use `edges`.

## Task 1: Add Report Provenance Schema

**Files:**

- Create: `server/db/migrations/009_phase9_report_provenance.sql`
- Test: `server/tests/report-provenance.test.mjs`

- [ ] **Step 1: Write migration test**

Create `server/tests/report-provenance.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

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
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --test server/tests/report-provenance.test.mjs
```

Expected:

```text
ENOENT
```

- [ ] **Step 3: Create migration**

Create `server/db/migrations/009_phase9_report_provenance.sql`:

```sql
alter table app.report_runs
  add column if not exists provenance jsonb not null default '{}'::jsonb;

create table if not exists app.report_provenance_records (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references app.report_runs(id) on delete cascade,
  graph_nodes jsonb not null default '[]'::jsonb,
  graph_edges jsonb not null default '[]'::jsonb,
  rule_hits jsonb not null default '[]'::jsonb,
  knowledge_sources jsonb not null default '[]'::jsonb,
  template_snapshot jsonb not null default '{}'::jsonb,
  safety_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_provenance_records_report_run_idx
  on app.report_provenance_records(report_run_id);
```

- [ ] **Step 4: Verify migration**

Run:

```bash
node --test server/tests/report-provenance.test.mjs
npm run db:migrate
```

Expected: both exit `0`.

- [ ] **Step 5: Commit schema**

Run:

```bash
git add server/db/migrations/009_phase9_report_provenance.sql server/tests/report-provenance.test.mjs
git commit -m "feat: add report provenance schema"
```

## Task 2: Add Normalized Graph Query Service

**Files:**

- Create: `server/graph/graph-query-service.mjs`
- Test: `server/tests/graph-query-service.test.mjs`

- [ ] **Step 1: Write graph service tests**

Create `server/tests/graph-query-service.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test server/tests/graph-query-service.test.mjs
```

Expected:

```text
ERR_MODULE_NOT_FOUND
```

- [ ] **Step 3: Implement normalized helpers**

Create `server/graph/graph-query-service.mjs` with:

```js
import { branchConflicts, earthlyBranches, elementCycles, fiveElements, heavenlyStems, tenGods } from './bazi-seed-data.mjs';

const conceptRows = [
  ...fiveElements.map((item) => ({ ...item, conceptType: '五行' })),
  ...heavenlyStems.map((item) => ({ ...item, conceptType: '天干' })),
  ...earthlyBranches.map((item) => ({ ...item, conceptType: '地支' })),
  ...tenGods.map((item) => ({ ...item, conceptType: '十神' })),
];

function conceptId(key) {
  return `concept:${key}`;
}

function node(id, type, label, metadata = {}) {
  return { id, type, label, metadata };
}

function edge(source, target, type, label = type, metadata = {}) {
  return { id: `${source}->${target}:${type}`, source, target, type, label, metadata };
}
```

- [ ] **Step 4: Implement createGraphQueryService fallback methods**

Add:

```js
export function createGraphQueryService({ graphDriver = null, database = 'neo4j' } = {}) {
  return {
    async getConceptGraph(key) {
      return getFallbackConceptGraph(key);
    },
    async getKnowledgeGraph(id, { pool } = {}) {
      const result = await pool.query('select * from app.knowledge_entries where id = $1', [id]);
      const item = result.rows[0];
      if (!item) throw new Error('KNOWLEDGE_NOT_FOUND');
      const focus = node(`knowledge:${item.id}`, 'Knowledge', item.title, { tags: item.tags || [], sourceNote: item.source_note || '' });
      const nodes = [focus];
      const edges = [];
      for (const key of item.concept_keys || []) {
        const concept = findConcept(key);
        const target = node(conceptId(concept.key), 'Concept', concept.label, { conceptType: concept.conceptType });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'EXPLAINS', '解释'));
      }
      return dedupeGraph({ focus, nodes, edges });
    },
  };
}
```

- [ ] **Step 5: Implement fallback helpers**

Add:

```js
function findConcept(keyOrLabel) {
  return conceptRows.find((item) => item.key === keyOrLabel || item.label === keyOrLabel) || { key: keyOrLabel, label: keyOrLabel, conceptType: '概念' };
}

function getFallbackConceptGraph(keyOrLabel) {
  const focusConcept = findConcept(keyOrLabel);
  const nodes = conceptRows.map((item) => node(conceptId(item.key), 'Concept', item.label, { conceptType: item.conceptType }));
  const labelToKey = new Map(conceptRows.map((item) => [item.label, item.key]));
  const edges = [
    ...elementCycles.generates.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'GENERATES', '相生')),
    ...elementCycles.restrains.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'RESTRAINS', '相克')),
    ...branchConflicts.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'CONFLICTS_WITH', '相冲')),
  ].filter((item) => !item.source.includes('undefined') && !item.target.includes('undefined'));
  const focus = node(conceptId(focusConcept.key), 'Concept', focusConcept.label, { conceptType: focusConcept.conceptType });
  return dedupeGraph({ focus, nodes, edges });
}

function dedupeGraph({ focus, nodes, edges }) {
  return {
    focus,
    nodes: [...new Map(nodes.map((item) => [item.id, item])).values()],
    edges: [...new Map(edges.map((item) => [item.id, item])).values()],
  };
}
```

- [ ] **Step 6: Run graph service tests**

Run:

```bash
node --test server/tests/graph-query-service.test.mjs
```

Expected: tests pass.

- [ ] **Step 7: Commit graph service**

Run:

```bash
git add server/graph/graph-query-service.mjs server/tests/graph-query-service.test.mjs
git commit -m "feat: add normalized graph query service"
```

## Task 3: Store Report Provenance

**Files:**

- Create: `server/graph/report-provenance-service.mjs`
- Modify: `server/routes/report-routes.mjs`
- Modify: `server/reports/context-builder.mjs`
- Test: `server/tests/report-provenance.test.mjs`
- Test: `server/tests/app-routes.test.mjs`

- [ ] **Step 1: Add provenance service tests**

Append:

```js
import { buildReportProvenance, saveReportProvenance } from '../graph/report-provenance-service.mjs';

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
  assert.equal(provenance.ruleHits[0].id, 'rule-1');
  assert.equal(provenance.knowledgeSources[0].id, 'knowledge-1');
  assert.equal(provenance.templateSnapshot.id, 'template-1');
});
```

- [ ] **Step 2: Implement provenance service**

Create `server/graph/report-provenance-service.mjs`:

```js
export function buildReportProvenance({ graph = { nodes: [], edges: [] }, context = {}, safety = {} } = {}) {
  return {
    graphNodes: graph.nodes || [],
    graphEdges: graph.edges || [],
    ruleHits: context.rules || [],
    knowledgeSources: context.knowledge || [],
    templateSnapshot: context.template || {},
    safetySnapshot: safety || {},
  };
}

export async function saveReportProvenance(client, { reportRunId, provenance }) {
  await client.query(
    `
      insert into app.report_provenance_records(report_run_id, graph_nodes, graph_edges, rule_hits, knowledge_sources, template_snapshot, safety_snapshot)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [reportRunId, provenance.graphNodes, provenance.graphEdges, provenance.ruleHits, provenance.knowledgeSources, provenance.templateSnapshot, provenance.safetySnapshot],
  );
  await client.query('update app.report_runs set provenance = $2 where id = $1', [reportRunId, provenance]);
}
```

- [ ] **Step 3: Wire report route**

In `server/routes/report-routes.mjs`, after building context and saving report run:

```js
const provenance = buildReportProvenance({
  graph: { nodes: [], edges: [] },
  context,
  safety,
});
await saveReportProvenance(client, { reportRunId: run.rows[0]?.id, provenance });
```

Use the normalized graph service in a later task to pass real graph nodes and edges; this task stores the source structure first.

- [ ] **Step 4: Update tests**

Update fake pool in `server/tests/app-routes.test.mjs` so report generation accepts:

```js
if (sql.includes('insert into app.report_provenance_records')) return { rows: [], rowCount: 1 };
if (sql.includes('update app.report_runs set provenance')) return { rows: [], rowCount: 1 };
```

- [ ] **Step 5: Run tests**

Run:

```bash
node --test server/tests/report-provenance.test.mjs server/tests/app-routes.test.mjs
```

Expected: tests pass.

- [ ] **Step 6: Commit provenance storage**

Run:

```bash
git add server/graph/report-provenance-service.mjs server/routes/report-routes.mjs server/reports/context-builder.mjs server/tests/report-provenance.test.mjs server/tests/app-routes.test.mjs
git commit -m "feat: store report provenance"
```

## Task 4: Add Graph Routes For Knowledge, Rule, Template, And Report

**Files:**

- Modify: `server/routes/graph-routes.mjs`
- Modify: `server/routes/report-history-routes.mjs`
- Test: `server/tests/graph-query-service.test.mjs`

- [ ] **Step 1: Add route tests**

Extend graph route tests to assert these endpoints return `{ nodes, edges, focus }`:

```text
/destiny-api/admin/graph/concepts/:key/paths
/destiny-api/admin/graph/knowledge/:id
/destiny-api/admin/graph/rules/:id
/destiny-api/admin/graph/templates/:id
/destiny-api/admin/graph/reports/:id
```

- [ ] **Step 2: Wire routes**

In `server/routes/graph-routes.mjs`, create the service:

```js
const graphService = createGraphQueryService({ graphDriver, database: config.neo4jDatabase });
```

Add route methods that call service methods and return normalized graph payloads.

- [ ] **Step 3: Keep backwards compatibility**

For `/concepts/:key/paths`, return:

```js
res.json({ ...graph, concept: graph.focus, relationships: graph.edges });
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:server
```

Expected: tests pass.

- [ ] **Step 5: Commit routes**

Run:

```bash
git add server/routes/graph-routes.mjs server/routes/report-history-routes.mjs server/tests/graph-query-service.test.mjs
git commit -m "feat: expose graph provenance routes"
```

## Task 5: Full Verification

Run:

```bash
npm run test:server
npm run test:py
npm run test:miniprogram
npm run lint
npm run build
rg -n "mchid|商户号|apiclient|wechatpay|WECHAT_PAY|tencentcloud-sdk-nodejs|SmsClient|SendSms|TENCENT_SECRET" server miniprogram src .env.example
```

Expected:

- Server tests pass.
- Python scaffold tests pass.
- Mini-program validation passes.
- TypeScript passes.
- Build succeeds.
- Forbidden integration scan has no real WeChat Pay or real Tencent SMS additions.

## Deployment Notes

After implementation:

```bash
npm run db:migrate
npm run graph:seed
curl -fsS https://www.goye.cc/destiny-api/admin/graph/health
```

Manual admin verification:

```text
1. Generate a report.
2. Open the admin report run detail.
3. Confirm provenance contains ruleHits, knowledgeSources, graphNodes, graphEdges, and templateSnapshot.
4. Open graph concept path for wood.
5. Confirm normalized nodes/edges are present.
```

## Self-Review Notes

- Graph computation: normalized concept and knowledge graphs start Phase 2.
- Provenance: report run provenance is stored in PostgreSQL for later visualization.
- Visualization UI remains Phase 3.
- Exclusions remain intact: no real WeChat Pay, no real Tencent SMS, no courier API.
