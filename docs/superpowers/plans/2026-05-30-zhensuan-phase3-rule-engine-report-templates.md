# Zhensuan Phase 3 Rule Engine And Report Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a semi-automatic rule engine and report template system that turns local knowledge and ontology paths into safe, structured, user-facing reports.

**Architecture:** PostgreSQL stores rule definitions, template definitions, report runs, and safety review results. The rule engine produces structured conclusions first; the online model only rewrites and organizes approved context. Report generation remains explainable by preserving rule hits, knowledge references, graph paths, and template sections.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, Neo4j, DeepSeek-compatible chat API, Vite, React, TypeScript, native `node:test`, Python unittest.

---

## Scope

This phase implements:

- Rule schema and report template schema.
- Rule condition evaluator for 八字 MVP features.
- Rule hit API and admin test runner.
- Template section editor and preview.
- Prompt context assembly from rules, knowledge, graph paths, and safety boundaries.
- Safety review pass before saving report history.
- Report history table and API.

This phase does not implement paid quota deduction, commerce, or real-time internet search.

## File Structure

- Create: `server/db/migrations/003_phase3_rules_reports.sql`
- Create: `server/rules/condition-evaluator.mjs`
- Create: `server/rules/rule-engine.mjs`
- Create: `server/reports/context-builder.mjs`
- Create: `server/reports/safety-review.mjs`
- Create: `server/reports/report-service.mjs`
- Create: `server/routes/rule-routes.mjs`
- Create: `server/routes/template-routes.mjs`
- Create: `server/routes/report-history-routes.mjs`
- Modify: `server/routes/report-routes.mjs` to call the report service.
- Modify: `server/app.mjs` to mount admin routes.
- Create: `server/tests/rule-engine.test.mjs`
- Create: `server/tests/report-safety.test.mjs`
- Create: `src/admin/pages/RulesPage.tsx`
- Create: `src/admin/pages/TemplatesPage.tsx`
- Create: `src/admin/pages/ReportRunsPage.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Create: `tests/test_phase3_rules_scaffold.py`

---

### Task 1: Add Rules And Report Schema

**Files:**
- Create: `server/db/migrations/003_phase3_rules_reports.sql`
- Test: `server/tests/rule-engine.test.mjs`

- [ ] **Step 1: Add migration smoke test**

Create or extend `server/tests/rule-engine.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('phase 3 migration defines rules templates and report runs', async () => {
  const sql = await fs.readFile(new URL('../db/migrations/003_phase3_rules_reports.sql', import.meta.url), 'utf8');
  for (const phrase of [
    'create table if not exists app.analysis_rules',
    'create table if not exists app.report_templates',
    'create table if not exists app.report_runs',
    'create table if not exists app.safety_reviews',
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Create migration**

Create `server/db/migrations/003_phase3_rules_reports.sql`:

```sql
create table if not exists app.analysis_rules (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'bazi',
  name text not null,
  priority integer not null default 100,
  weight numeric(8,2) not null default 1,
  condition jsonb not null,
  conclusion text not null,
  advice text not null default '',
  risk_boundary text not null default '',
  knowledge_entry_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  created_by uuid references app.users(id) on delete set null,
  published_by uuid references app.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.report_templates (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'bazi',
  name text not null,
  report_kind text not null,
  sections jsonb not null,
  tone text not null default '亲民、克制、清晰',
  disclaimer text not null,
  forbidden_expressions text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  created_by uuid references app.users(id) on delete set null,
  published_by uuid references app.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.report_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references app.users(id) on delete set null,
  report_kind text not null,
  input_payload jsonb not null,
  structured_context jsonb not null,
  final_report jsonb not null,
  source text not null check (source in ('fallback', 'ai', 'testbench')),
  created_at timestamptz not null default now()
);

create table if not exists app.safety_reviews (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid references app.report_runs(id) on delete cascade,
  passed boolean not null,
  flags text[] not null default '{}',
  reviewed_text text not null default '',
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Run test**

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add server/db/migrations/003_phase3_rules_reports.sql server/tests/rule-engine.test.mjs
git commit -m "feat: add rule and report schema"
```

---

### Task 2: Implement Rule Condition Evaluator

**Files:**
- Create: `server/rules/condition-evaluator.mjs`
- Create: `server/rules/rule-engine.mjs`
- Test: `server/tests/rule-engine.test.mjs`

- [ ] **Step 1: Add evaluator tests**

Append:

```js
import { evaluateCondition } from '../rules/condition-evaluator.mjs';
import { rankRuleHits } from '../rules/rule-engine.mjs';

test('condition evaluator matches element minimum count', () => {
  const features = { elements: { 木: 3, 火: 1 } };
  const condition = { all: [{ field: 'elements.木', operator: 'gte', value: 2 }] };
  assert.equal(evaluateCondition(condition, features), true);
});

test('rule engine ranks by priority then weight', () => {
  const hits = rankRuleHits([
    { id: 'a', priority: 20, weight: 1 },
    { id: 'b', priority: 10, weight: 1 },
    { id: 'c', priority: 10, weight: 3 },
  ]);
  assert.deepEqual(hits.map((hit) => hit.id), ['c', 'b', 'a']);
});
```

- [ ] **Step 2: Implement evaluator**

Create `server/rules/condition-evaluator.mjs`:

```js
function readPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function compare(actual, operator, expected) {
  if (operator === 'eq') return actual === expected;
  if (operator === 'neq') return actual !== expected;
  if (operator === 'gte') return Number(actual || 0) >= Number(expected);
  if (operator === 'lte') return Number(actual || 0) <= Number(expected);
  if (operator === 'includes') return Array.isArray(actual) && actual.includes(expected);
  return false;
}

export function evaluateCondition(condition, features) {
  if (condition.all) {
    return condition.all.every((item) => evaluateCondition(item, features));
  }
  if (condition.any) {
    return condition.any.some((item) => evaluateCondition(item, features));
  }
  return compare(readPath(features, condition.field), condition.operator, condition.value);
}
```

- [ ] **Step 3: Implement rule ranking**

Create `server/rules/rule-engine.mjs`:

```js
import { evaluateCondition } from './condition-evaluator.mjs';

export function rankRuleHits(hits) {
  return [...hits].sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return Number(right.weight) - Number(left.weight);
  });
}

export function runRules(rules, features) {
  return rankRuleHits(rules.filter((rule) => evaluateCondition(rule.condition, features)));
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:server
git add server/rules server/tests/rule-engine.test.mjs
git commit -m "feat: add rule evaluator"
```

Expected: PASS before commit.

---

### Task 3: Add Report Context Builder And Safety Review

**Files:**
- Create: `server/reports/context-builder.mjs`
- Create: `server/reports/safety-review.mjs`
- Test: `server/tests/report-safety.test.mjs`

- [ ] **Step 1: Write safety tests**

Create `server/tests/report-safety.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewReportText } from '../reports/safety-review.mjs';

test('safety review blocks absolute claims', () => {
  const result = reviewReportText('你一定发财，并且保证复合。');
  assert.equal(result.passed, false);
  assert.deepEqual(result.flags, ['absolute_claim']);
});

test('safety review allows restrained advice', () => {
  const result = reviewReportText('建议先观察现实反馈，再做小步调整。');
  assert.equal(result.passed, true);
  assert.deepEqual(result.flags, []);
});
```

- [ ] **Step 2: Implement safety review**

Create `server/reports/safety-review.mjs`:

```js
const absolutePatterns = [/一定/, /必定/, /保证/, /改命/, /转运/, /必然/];

export function reviewReportText(text) {
  const hasAbsoluteClaim = absolutePatterns.some((pattern) => pattern.test(text));
  return {
    passed: !hasAbsoluteClaim,
    flags: hasAbsoluteClaim ? ['absolute_claim'] : [],
  };
}
```

- [ ] **Step 3: Implement context builder**

Create `server/reports/context-builder.mjs`:

```js
export function buildReportContext({ input, features, ruleHits, knowledgeEntries, template }) {
  return {
    input,
    features,
    rules: ruleHits.map((rule) => ({
      id: rule.id,
      name: rule.name,
      conclusion: rule.conclusion,
      advice: rule.advice,
      riskBoundary: rule.risk_boundary || rule.riskBoundary || '',
      knowledgeEntryIds: rule.knowledge_entry_ids || rule.knowledgeEntryIds || [],
    })),
    knowledge: knowledgeEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      body: entry.body,
    })),
    template: {
      id: template.id,
      name: template.name,
      sections: template.sections,
      tone: template.tone,
      disclaimer: template.disclaimer,
    },
  };
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:server
git add server/reports server/tests/report-safety.test.mjs
git commit -m "feat: add report context safety"
```

Expected: PASS before commit.

---

### Task 4: Add Rule, Template, And Report APIs

**Files:**
- Create: `server/routes/rule-routes.mjs`
- Create: `server/routes/template-routes.mjs`
- Create: `server/routes/report-history-routes.mjs`
- Create: `server/reports/report-service.mjs`
- Modify: `server/routes/report-routes.mjs`
- Modify: `server/app.mjs`

- [ ] **Step 1: Define admin rule endpoints**

Create endpoints:

```text
GET    /destiny-api/admin/rules
POST   /destiny-api/admin/rules
PATCH  /destiny-api/admin/rules/:id
POST   /destiny-api/admin/rules/:id/publish
POST   /destiny-api/admin/rules/:id/disable
POST   /destiny-api/admin/rules/test
```

Rules:

- Editors can save drafts and run tests.
- Admins can publish and disable.
- Test endpoint returns feature extraction, matching rules, ranking order, and related knowledge IDs.

- [ ] **Step 2: Define template endpoints**

Create endpoints:

```text
GET    /destiny-api/admin/templates
POST   /destiny-api/admin/templates
PATCH  /destiny-api/admin/templates/:id
POST   /destiny-api/admin/templates/:id/publish
POST   /destiny-api/admin/templates/:id/preview
```

Preview endpoint uses a sample input and returns structured report sections without saving a customer report.

- [ ] **Step 3: Define report history endpoints**

Create endpoints:

```text
GET /destiny-api/admin/report-runs
GET /destiny-api/admin/report-runs/:id
GET /destiny-api/customer/report-runs
```

Customer endpoint requires a customer session and only returns the current customer reports.

- [ ] **Step 4: Route report generation through report service**

Modify `/destiny-api/generate` so it:

1. Validates input.
2. Extracts features.
3. Loads published rules and template.
4. Runs rules.
5. Builds model context.
6. Calls model or fallback.
7. Runs safety review.
8. Saves report run.
9. Returns final report.

- [ ] **Step 5: Run checks and commit**

```powershell
npm run test:server
npm run lint
git add server/routes server/reports server/app.mjs
git commit -m "feat: add rule template report api"
```

Expected: both checks PASS before commit.

---

### Task 5: Add Admin Rule And Template UI

**Files:**
- Create: `src/admin/pages/RulesPage.tsx`
- Create: `src/admin/pages/TemplatesPage.tsx`
- Create: `src/admin/pages/ReportRunsPage.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Test: `tests/test_phase3_rules_scaffold.py`

- [ ] **Step 1: Add scaffold test**

Create `tests/test_phase3_rules_scaffold.py`:

```python
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Phase3RulesScaffoldTests(unittest.TestCase):
    def test_rule_template_pages_exist(self):
        for relative in [
            "src/admin/pages/RulesPage.tsx",
            "src/admin/pages/TemplatesPage.tsx",
            "src/admin/pages/ReportRunsPage.tsx",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_navigation_contains_rule_sections(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        for label in ["分析规则", "报告模板", "报告记录"]:
            self.assertIn(label, layout)
```

- [ ] **Step 2: Build UI pages**

Create:

- `RulesPage.tsx`: rule list, JSON condition editor, natural-language draft input panel, test-run button.
- `TemplatesPage.tsx`: section editor, tone/disclaimer fields, preview panel.
- `ReportRunsPage.tsx`: report history list, rule hit detail, safety review flags.

- [ ] **Step 3: Run checks and commit**

```powershell
python -m unittest tests.test_phase3_rules_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase3_rules_scaffold.py
git commit -m "feat: add rule template admin"
```

Expected: all checks PASS before commit.

---

## Acceptance Criteria

- Published knowledge and rules can generate a structured report context.
- Rule hits are ranked deterministically by priority and weight.
- Templates control report sections, tone, disclaimer, and forbidden expressions.
- Safety review blocks absolute or risky report wording before saving.
- Admin can create, test, publish, and inspect rules and templates.
- Customers can receive reports through the existing generation endpoint.
