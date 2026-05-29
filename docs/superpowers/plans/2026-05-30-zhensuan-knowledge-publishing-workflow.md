# 甄算知识库发布工作流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-safe publishing workflow so knowledge entries, analysis rules, and report templates can be drafted, published, disabled, versioned, audited, and safely consumed by report generation.

**Architecture:** Keep PostgreSQL as the source of truth for publishable content and versions. Add a small publishing service layer so knowledge, rules, and templates share version/audit behavior, while routes remain thin and admin UI exposes the workflow without changing customer-facing APIs. Report generation must read only published content.

**Tech Stack:** Node.js, Express, PostgreSQL migrations, React/Vite admin UI, Node test runner, Python unittest scaffold checks.

---

## Source References

- Scope: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- Roadmap: `docs/superpowers/plans/2026-05-30-zhensuan-1.0-implementation-roadmap.md`
- Current knowledge route: `server/routes/knowledge-routes.mjs`
- Current rule route: `server/routes/rule-routes.mjs`
- Current template route: `server/routes/template-routes.mjs`
- Current schema: `server/db/migrations/002_phase2_knowledge.sql`, `server/db/migrations/003_phase3_rules_reports.sql`

## File Structure

Create:

- `server/db/migrations/008_phase8_publish_workflow.sql`: adds version tables and missing publish metadata for rules/templates.
- `server/content/publishing-service.mjs`: shared publish/disable/version/audit functions.
- `server/content/published-content-service.mjs`: reads only published content for reports.
- `server/tests/knowledge-publishing.test.mjs`: tests publish, disable, version, and audit behavior.
- `server/tests/report-published-content.test.mjs`: tests report context excludes drafts and disabled records.

Modify:

- `server/routes/knowledge-routes.mjs`: use publishing service for publish/disable and filter by status.
- `server/routes/rule-routes.mjs`: add pool-backed CRUD, publish, disable, and version behavior.
- `server/routes/template-routes.mjs`: add pool-backed CRUD, publish, disable, version, and preview behavior.
- `server/reports/context-builder.mjs`: accept published content and keep provenance-ready metadata.
- `server/routes/report-routes.mjs`: load published knowledge/rules/templates when pool is configured.
- `src/admin/pages/KnowledgePage.tsx`: expose draft/published/disabled status and publish/disable actions.
- `src/admin/pages/RulesPage.tsx`: expose rule status, publish/disable actions, and linked knowledge fields.
- `src/admin/pages/TemplatesPage.tsx`: expose template status, publish/disable actions, and disclaimer fields.
- `tests/test_phase_admin_scaffold.py`: assert admin pages contain publish workflow terms.

Do not modify:

- WeChat Pay placeholder provider.
- Tencent SMS placeholder/mock behavior.
- Mini-program login behavior implemented in Phase 0.
- `miniprogram/project.config.json`.

## Data Contract

Publish request body:

```json
{
  "changeSummary": "补充五行偏旺解释"
}
```

Publish response:

```json
{
  "item": {
    "id": "uuid",
    "status": "published",
    "version_no": 2,
    "published_at": "2026-05-30T00:00:00.000Z"
  },
  "version": {
    "version_no": 2,
    "change_summary": "补充五行偏旺解释"
  }
}
```

Disable request body:

```json
{
  "changeSummary": "表达不再适合线上报告"
}
```

Disable response:

```json
{
  "item": {
    "id": "uuid",
    "status": "disabled"
  }
}
```

## Task 1: Add Publish Workflow Schema

**Files:**

- Create: `server/db/migrations/008_phase8_publish_workflow.sql`
- Test: `server/tests/knowledge-publishing.test.mjs`

- [ ] **Step 1: Write migration existence test**

Add to `server/tests/knowledge-publishing.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('publish workflow migration creates version tables and metadata fields', () => {
  const sql = readFileSync(new URL('../db/migrations/008_phase8_publish_workflow.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists app\.analysis_rule_versions/i);
  assert.match(sql, /create table if not exists app\.report_template_versions/i);
  assert.match(sql, /alter table app\.analysis_rules/i);
  assert.match(sql, /alter table app\.report_templates/i);
  assert.match(sql, /change_summary/i);
  assert.match(sql, /version_no/i);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
```

Expected:

```text
ENOENT
```

because migration `008_phase8_publish_workflow.sql` does not exist yet.

- [ ] **Step 3: Create migration**

Create `server/db/migrations/008_phase8_publish_workflow.sql`:

```sql
alter table app.knowledge_entries
  add column if not exists version_no int not null default 0,
  add column if not exists applicable_scope jsonb not null default '{}'::jsonb,
  add column if not exists concept_keys text[] not null default '{}',
  add column if not exists source_note text not null default '';

alter table app.knowledge_entry_versions
  add column if not exists change_summary text not null default '',
  add column if not exists applicable_scope jsonb not null default '{}'::jsonb,
  add column if not exists concept_keys text[] not null default '{}',
  add column if not exists source_note text not null default '';

alter table app.analysis_rules
  add column if not exists version_no int not null default 0,
  add column if not exists graph_node_keys text[] not null default '{}',
  add column if not exists trigger_explanation text not null default '',
  add column if not exists published_by uuid references app.users(id),
  add column if not exists published_at timestamptz;

alter table app.report_templates
  add column if not exists version_no int not null default 0,
  add column if not exists published_by uuid references app.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists risk_boundary text not null default '',
  add column if not exists template_scope jsonb not null default '{}'::jsonb;

create table if not exists app.analysis_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references app.analysis_rules(id),
  version_no int not null,
  module text not null,
  name text not null,
  priority int not null,
  weight int not null,
  condition jsonb not null default '{}'::jsonb,
  conclusion text not null default '',
  advice text not null default '',
  risk_boundary text not null default '',
  knowledge_entry_ids uuid[] not null default '{}',
  graph_node_keys text[] not null default '{}',
  trigger_explanation text not null default '',
  change_summary text not null default '',
  published_by uuid references app.users(id),
  published_at timestamptz not null default now(),
  unique(rule_id, version_no)
);

create table if not exists app.report_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references app.report_templates(id),
  version_no int not null,
  module text not null,
  name text not null,
  report_kind text not null,
  sections jsonb not null default '[]'::jsonb,
  tone text not null default '',
  disclaimer text not null default '',
  forbidden_expressions text[] not null default '{}',
  risk_boundary text not null default '',
  template_scope jsonb not null default '{}'::jsonb,
  change_summary text not null default '',
  published_by uuid references app.users(id),
  published_at timestamptz not null default now(),
  unique(template_id, version_no)
);

create index if not exists knowledge_entries_status_updated_idx
  on app.knowledge_entries(status, updated_at desc);

create index if not exists analysis_rules_status_priority_idx
  on app.analysis_rules(status, priority asc, weight desc);

create index if not exists report_templates_status_kind_idx
  on app.report_templates(status, report_kind);
```

- [ ] **Step 4: Run migration test and migration command**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
npm run db:migrate
```

Expected:

```text
# pass
```

and `npm run db:migrate` exits `0`.

- [ ] **Step 5: Commit schema work**

Run:

```bash
git add server/db/migrations/008_phase8_publish_workflow.sql server/tests/knowledge-publishing.test.mjs
git commit -m "feat: add publish workflow schema"
```

## Task 2: Add Shared Publishing Service

**Files:**

- Create: `server/content/publishing-service.mjs`
- Test: `server/tests/knowledge-publishing.test.mjs`

- [ ] **Step 1: Add service tests**

Append to `server/tests/knowledge-publishing.test.mjs`:

```js
import { disableItem, publishItem } from '../content/publishing-service.mjs';

function createPublishingClient({ itemType }) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: normalized, params });
      if (normalized.includes('select * from app.knowledge_entries')) {
        return { rows: [{ id: 'knowledge-1', module: 'bazi', title: '五行偏旺', summary: '', body: '正文', tags: ['五行'], risk_note: '', applicable_scope: {}, concept_keys: ['wood'], source_note: '', version_no: 1 }], rowCount: 1 };
      }
      if (normalized.includes('select * from app.analysis_rules')) {
        return { rows: [{ id: 'rule-1', module: 'bazi', name: '木旺', priority: 10, weight: 5, condition: {}, conclusion: '木旺', advice: '保持平衡', risk_boundary: '', knowledge_entry_ids: [], graph_node_keys: ['wood'], trigger_explanation: '', version_no: 1 }], rowCount: 1 };
      }
      if (normalized.includes('select * from app.report_templates')) {
        return { rows: [{ id: 'template-1', module: 'bazi', name: '完整报告', report_kind: 'life', sections: [], tone: '亲民', disclaimer: '仅供参考', forbidden_expressions: ['一定'], risk_boundary: '', template_scope: {}, version_no: 1 }], rowCount: 1 };
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
```

- [ ] **Step 2: Run service tests and verify they fail**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
```

Expected:

```text
ERR_MODULE_NOT_FOUND
```

because `server/content/publishing-service.mjs` does not exist yet.

- [ ] **Step 3: Implement service constants and metadata**

Create `server/content/publishing-service.mjs` with:

```js
const types = {
  knowledge: {
    table: 'app.knowledge_entries',
    versionTable: 'app.knowledge_entry_versions',
    idColumn: 'entry_id',
    targetType: 'knowledge_entry',
  },
  rule: {
    table: 'app.analysis_rules',
    versionTable: 'app.analysis_rule_versions',
    idColumn: 'rule_id',
    targetType: 'analysis_rule',
  },
  template: {
    table: 'app.report_templates',
    versionTable: 'app.report_template_versions',
    idColumn: 'template_id',
    targetType: 'report_template',
  },
};

function getType(type) {
  const meta = types[type];
  if (!meta) {
    throw new Error(`UNKNOWN_PUBLISH_TYPE:${type}`);
  }
  return meta;
}

function normalizeSummary(changeSummary) {
  return String(changeSummary || '').trim() || '发布内容';
}
```

- [ ] **Step 4: Implement publishItem**

Add:

```js
export async function publishItem(client, { type, id, actorUserId, changeSummary }) {
  const meta = getType(type);
  const summary = normalizeSummary(changeSummary);
  const current = await client.query(`select * from ${meta.table} where id = $1`, [id]);
  const item = current.rows[0];
  if (!item) {
    throw new Error('PUBLISH_TARGET_NOT_FOUND');
  }
  const nextVersion = Number(item.version_no || 0) + 1;
  const published = await client.query(
    `update ${meta.table} set status = 'published', version_no = $2, published_by = $3, published_at = now(), updated_at = now() where id = $1 returning *`,
    [id, nextVersion, actorUserId || null],
  );
  const version = await insertVersion(client, { type, item, nextVersion, actorUserId, changeSummary: summary });
  await writeAudit(client, {
    actorUserId,
    action: `${meta.targetType}.publish`,
    targetType: meta.targetType,
    targetId: id,
    metadata: { versionNo: nextVersion, changeSummary: summary },
  });
  return { item: published.rows[0], version: version.rows[0] };
}
```

- [ ] **Step 5: Implement disableItem**

Add:

```js
export async function disableItem(client, { type, id, actorUserId, changeSummary }) {
  const meta = getType(type);
  const summary = normalizeSummary(changeSummary || '停用内容');
  const disabled = await client.query(
    `update ${meta.table} set status = 'disabled', updated_at = now() where id = $1 returning *`,
    [id],
  );
  if (!disabled.rowCount) {
    throw new Error('PUBLISH_TARGET_NOT_FOUND');
  }
  await writeAudit(client, {
    actorUserId,
    action: `${meta.targetType}.disable`,
    targetType: meta.targetType,
    targetId: id,
    metadata: { changeSummary: summary },
  });
  return { item: disabled.rows[0] };
}
```

- [ ] **Step 6: Implement insertVersion and writeAudit helpers**

Add:

```js
async function insertVersion(client, { type, item, nextVersion, actorUserId, changeSummary }) {
  if (type === 'knowledge') {
    return client.query(
      `
        insert into app.knowledge_entry_versions(entry_id, version_no, title, summary, body, tags, risk_note, applicable_scope, concept_keys, source_note, published_by, change_summary)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning *
      `,
      [item.id, nextVersion, item.title, item.summary || '', item.body || '', item.tags || [], item.risk_note || '', item.applicable_scope || {}, item.concept_keys || [], item.source_note || '', actorUserId || null, changeSummary],
    );
  }
  if (type === 'rule') {
    return client.query(
      `
        insert into app.analysis_rule_versions(rule_id, version_no, module, name, priority, weight, condition, conclusion, advice, risk_boundary, knowledge_entry_ids, graph_node_keys, trigger_explanation, published_by, change_summary)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        returning *
      `,
      [item.id, nextVersion, item.module, item.name, item.priority, item.weight, item.condition || {}, item.conclusion || '', item.advice || '', item.risk_boundary || '', item.knowledge_entry_ids || [], item.graph_node_keys || [], item.trigger_explanation || '', actorUserId || null, changeSummary],
    );
  }
  return client.query(
    `
      insert into app.report_template_versions(template_id, version_no, module, name, report_kind, sections, tone, disclaimer, forbidden_expressions, risk_boundary, template_scope, published_by, change_summary)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning *
    `,
    [item.id, nextVersion, item.module, item.name, item.report_kind, item.sections || [], item.tone || '', item.disclaimer || '', item.forbidden_expressions || [], item.risk_boundary || '', item.template_scope || {}, actorUserId || null, changeSummary],
  );
}

async function writeAudit(client, { actorUserId, action, targetType, targetId, metadata }) {
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId || null, action, targetType, targetId, metadata],
  );
}
```

- [ ] **Step 7: Run service tests**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 8: Commit service work**

Run:

```bash
git add server/content/publishing-service.mjs server/tests/knowledge-publishing.test.mjs
git commit -m "feat: add content publishing service"
```

## Task 3: Wire Publishing Into Admin Routes

**Files:**

- Modify: `server/routes/knowledge-routes.mjs`
- Modify: `server/routes/rule-routes.mjs`
- Modify: `server/routes/template-routes.mjs`
- Test: `server/tests/knowledge-publishing.test.mjs`

- [ ] **Step 1: Add route tests for publish and disable**

Append route tests that create an Express app with `createApp`, a fake admin session, and fake pool responses. The tests must assert:

```js
assert.equal(publishResponse.status, 200);
assert.equal(disableResponse.status, 200);
assert.ok(queries.some((query) => query.sql.includes('insert into app.audit_logs')));
assert.ok(queries.some((query) => query.params.includes('admin-user-1')));
```

Use authorization header:

```js
headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' }
```

The fake pool must return the admin session for queries containing `from app.login_sessions`.

- [ ] **Step 2: Run route tests and verify they fail**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
```

Expected:

```text
not ok
```

because rules/templates are memory-only and knowledge publish does not write version/audit rows.

- [ ] **Step 3: Update knowledge routes**

Modify `server/routes/knowledge-routes.mjs`:

```js
import { disableItem, publishItem } from '../content/publishing-service.mjs';
```

For pool-backed list:

```js
const status = req.query.status;
const result = await pool.query(
  `
    select *
    from app.knowledge_entries
    where ($1::text is null or status = $1)
    order by updated_at desc
    limit 100
  `,
  [status || null],
);
```

For publish:

```js
const client = await pool.connect();
try {
  await client.query('begin');
  const result = await publishItem(client, {
    type: 'knowledge',
    id: req.params.id,
    actorUserId: req.session?.user_id,
    changeSummary: req.body?.changeSummary,
  });
  await client.query('commit');
  res.json(result);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
}
```

For disable, call `disableItem` with `type: 'knowledge'`.

- [ ] **Step 4: Update rule routes for pool-backed CRUD**

Change `mountRuleRoutes(app)` to `mountRuleRoutes(app, { pool })` and update `server/app.mjs` if needed.

Pool-backed list:

```js
const result = await pool.query('select * from app.analysis_rules order by priority asc, updated_at desc limit 100');
res.json({ rules: result.rows });
```

Pool-backed create:

```js
const body = req.body || {};
const result = await pool.query(
  `
    insert into app.analysis_rules(module, name, priority, weight, condition, conclusion, advice, risk_boundary, knowledge_entry_ids, graph_node_keys, trigger_explanation)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    returning *
  `,
  [body.module || 'bazi', body.name, body.priority || 100, body.weight || 0, body.condition || {}, body.conclusion || '', body.advice || '', body.risk_boundary || '', body.knowledge_entry_ids || [], body.graph_node_keys || [], body.trigger_explanation || ''],
);
```

Publish and disable call `publishItem` / `disableItem` with `type: 'rule'`.

- [ ] **Step 5: Update template routes for pool-backed CRUD**

Change `mountTemplateRoutes(app)` to `mountTemplateRoutes(app, { pool })` and update `server/app.mjs` if needed.

Pool-backed list:

```js
const result = await pool.query('select * from app.report_templates order by updated_at desc limit 100');
res.json({ templates: result.rows });
```

Pool-backed create:

```js
const body = req.body || {};
const result = await pool.query(
  `
    insert into app.report_templates(module, name, report_kind, sections, tone, disclaimer, forbidden_expressions, risk_boundary, template_scope)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning *
  `,
  [body.module || 'bazi', body.name, body.report_kind || 'life', body.sections || [], body.tone || '亲民、克制、可解释', body.disclaimer || '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。', body.forbidden_expressions || ['一定', '必定', '保证'], body.risk_boundary || '', body.template_scope || {}],
);
```

Publish and disable call `publishItem` / `disableItem` with `type: 'template'`.

- [ ] **Step 6: Run route tests**

Run:

```bash
node --test server/tests/knowledge-publishing.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 7: Commit route work**

Run:

```bash
git add server/app.mjs server/routes/knowledge-routes.mjs server/routes/rule-routes.mjs server/routes/template-routes.mjs server/tests/knowledge-publishing.test.mjs
git commit -m "feat: wire publish workflow into admin routes"
```

## Task 4: Ensure Reports Read Only Published Content

**Files:**

- Create: `server/content/published-content-service.mjs`
- Modify: `server/reports/context-builder.mjs`
- Modify: `server/routes/report-routes.mjs`
- Test: `server/tests/report-published-content.test.mjs`

- [ ] **Step 1: Write published content tests**

Create `server/tests/report-published-content.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test server/tests/report-published-content.test.mjs
```

Expected:

```text
ERR_MODULE_NOT_FOUND
```

because `published-content-service.mjs` does not exist yet.

- [ ] **Step 3: Implement published content loader**

Create `server/content/published-content-service.mjs`:

```js
export async function loadPublishedReportContent(pool, { reportKind = 'life', module = 'bazi' } = {}) {
  if (!pool) {
    return { knowledge: [], rules: [], template: null };
  }

  const [knowledge, rules, templates] = await Promise.all([
    pool.query(
      `
        select *
        from app.knowledge_entries
        where status = 'published'
          and module = $1
        order by updated_at desc
        limit 50
      `,
      [module],
    ),
    pool.query(
      `
        select *
        from app.analysis_rules
        where status = 'published'
          and module = $1
        order by priority asc, weight desc
        limit 100
      `,
      [module],
    ),
    pool.query(
      `
        select *
        from app.report_templates
        where status = 'published'
          and module = $1
          and report_kind = $2
        order by published_at desc nulls last, updated_at desc
        limit 1
      `,
      [module, reportKind],
    ),
  ]);

  return {
    knowledge: knowledge.rows,
    rules: rules.rows,
    template: templates.rows[0] || null,
  };
}
```

- [ ] **Step 4: Wire report route**

Modify `server/routes/report-routes.mjs`:

```js
import { loadPublishedReportContent } from '../content/published-content-service.mjs';
```

Before assembling report context, load:

```js
const publishedContent = await loadPublishedReportContent(pool, {
  reportKind: kind,
  module: kind === 'life' ? 'bazi' : kind,
});
```

Pass `publishedContent.rules`, `publishedContent.knowledge`, and `publishedContent.template` into the report context assembly. Preserve existing fallback behavior when there is no pool.

- [ ] **Step 5: Run published content tests and existing report tests**

Run:

```bash
node --test server/tests/report-published-content.test.mjs server/tests/app-routes.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 6: Commit report content work**

Run:

```bash
git add server/content/published-content-service.mjs server/reports/context-builder.mjs server/routes/report-routes.mjs server/tests/report-published-content.test.mjs
git commit -m "feat: use published content for report context"
```

## Task 5: Update Admin UI Scaffold

**Files:**

- Modify: `src/admin/pages/KnowledgePage.tsx`
- Modify: `src/admin/pages/RulesPage.tsx`
- Modify: `src/admin/pages/TemplatesPage.tsx`
- Modify: `tests/test_phase_admin_scaffold.py`

- [ ] **Step 1: Add admin scaffold assertions**

Modify `tests/test_phase_admin_scaffold.py` to assert:

```python
knowledge = (ROOT / "src" / "admin" / "pages" / "KnowledgePage.tsx").read_text(encoding="utf-8")
rules = (ROOT / "src" / "admin" / "pages" / "RulesPage.tsx").read_text(encoding="utf-8")
templates = (ROOT / "src" / "admin" / "pages" / "TemplatesPage.tsx").read_text(encoding="utf-8")

self.assertIn("发布", knowledge)
self.assertIn("停用", knowledge)
self.assertIn("版本", knowledge)
self.assertIn("发布", rules)
self.assertIn("停用", rules)
self.assertIn("关联知识", rules)
self.assertIn("发布", templates)
self.assertIn("停用", templates)
self.assertIn("免责声明", templates)
```

- [ ] **Step 2: Run scaffold test and verify it fails**

Run:

```bash
python -m unittest tests.test_phase_admin_scaffold
```

Expected:

```text
FAIL
```

because the pages do not yet show all workflow terms.

- [ ] **Step 3: Update pages**

Update each page with visible controls for:

- Status tabs or select: 草稿、已发布、已停用。
- Version label: `版本`。
- Publish button: `发布`。
- Disable button: `停用`。
- Change summary input: `变更摘要`。

Rules page also includes:

- `关联知识`
- `关联图谱节点`
- `风险边界`

Templates page also includes:

- `免责声明`
- `禁用表达`
- `免费版 / 完整版`

- [ ] **Step 4: Run UI checks**

Run:

```bash
python -m unittest tests.test_phase_admin_scaffold
npm run lint
npm run build
```

Expected:

```text
OK
```

and build exits `0`.

- [ ] **Step 5: Commit UI scaffold work**

Run:

```bash
git add src/admin/pages/KnowledgePage.tsx src/admin/pages/RulesPage.tsx src/admin/pages/TemplatesPage.tsx tests/test_phase_admin_scaffold.py
git commit -m "feat: expose publish workflow in admin ui"
```

## Task 6: Full Verification

**Files:**

- Modify only if verification reveals a real defect.

- [ ] **Step 1: Run server tests**

Run:

```bash
npm run test:server
```

Expected:

```text
# pass
```

- [ ] **Step 2: Run Python scaffold tests**

Run:

```bash
npm run test:py
```

Expected:

```text
OK
```

- [ ] **Step 3: Run mini-program validation**

Run:

```bash
npm run test:miniprogram
```

Expected:

```text
```

The command exits `0`.

- [ ] **Step 4: Run type check and build**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 5: Verify excluded integrations stay excluded**

Run:

```bash
rg -n "mchid|商户号|apiclient|wechatpay|WECHAT_PAY|tencentcloud-sdk-nodejs|SmsClient|SendSms|TENCENT_SECRET" server miniprogram src .env.example
```

Expected:

```text
```

No output. Existing placeholder file names are allowed only when the file remains a placeholder and no real provider credentials or SDK calls are added.

- [ ] **Step 6: Commit verification fix if one was needed**

If verification required a fix:

```bash
git add <changed-files>
git commit -m "fix: stabilize publish workflow verification"
```

If no fix was needed, do not create an empty commit.

## Deployment Notes

After implementation:

```bash
npm run db:migrate
npm run test:server
npm run build
```

Then restart the deployed backend and verify:

```bash
curl -fsS https://www.goye.cc/destiny-api/health
curl -fsS https://www.goye.cc/destiny-api/admin/ops/health
```

Manual admin verification:

```text
1. Log in as platform admin.
2. Create a knowledge draft.
3. Confirm it does not appear in report context.
4. Publish it with a change summary.
5. Confirm a version row and audit log exist.
6. Generate a report.
7. Confirm only published content participates in the report.
8. Disable the content.
9. Confirm it no longer participates in the report.
```

## Self-Review Notes

- Knowledge entries: publish, disable, version, and audit are covered.
- Rules: pool-backed publish, disable, version, and audit are covered.
- Templates: pool-backed publish, disable, version, and audit are covered.
- Report generation: published-only content loading is covered.
- Admin UI: publish workflow terms and controls are covered.
- Exclusions: no real WeChat Pay, real refund, real Tencent SMS, or courier API work is included.
- Current unrelated worktree change: `miniprogram/project.config.json` remains outside this plan.
