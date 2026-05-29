# Zhensuan Phase 2 Bazi Knowledge MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first maintainable 八字知识库 MVP with PostgreSQL content records, Neo4j ontology seeds, admin CRUD, graph path viewing, and a manual four-pillar test bench.

**Architecture:** PostgreSQL stores editable knowledge entries, publish states, sources, and version records. Neo4j stores ontology concepts and relationships, while Express APIs bridge admin operations and graph queries. React Admin pages expose knowledge editing and path inspection without requiring editors to write Cypher.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, Neo4j Community, Cypher, Vite, React, TypeScript, native `node:test`, Python unittest.

---

## Scope

This phase implements:

- Neo4j connection configuration and health checks.
- PostgreSQL tables for knowledge entries, sources, tags, and publication state.
- 八字 ontology seed data: 天干、地支、五行、阴阳、十神、四柱、藏干、基础合冲刑害破关系。
- Admin pages for knowledge entries and ontology graph viewing.
- Manual four-pillar test bench for internal validation.
- Graph path API that explains how concepts, knowledge, and rules connect.

This phase does not implement rule scoring, final report generation, membership, commerce, or payment.

## File Structure

- Modify: `.env.example` for Neo4j connection variables.
- Modify: `package.json` for Neo4j dependency and phase test script.
- Create: `server/db/migrations/002_phase2_knowledge.sql` for knowledge storage.
- Create: `server/graph/neo4j-driver.mjs` for Neo4j driver lifecycle.
- Create: `server/graph/bazi-seed-data.mjs` for canonical seed arrays.
- Create: `server/graph/seed-bazi-ontology.mjs` for idempotent Neo4j seeding.
- Create: `server/routes/knowledge-routes.mjs` for knowledge CRUD.
- Create: `server/routes/graph-routes.mjs` for ontology/path APIs.
- Create: `server/routes/testbench-routes.mjs` for manual four-pillar validation.
- Modify: `server/app.mjs` to mount knowledge, graph, and test bench routes.
- Create: `server/tests/bazi-seed.test.mjs` for ontology seed integrity.
- Create: `server/tests/knowledge-schema.test.mjs` for migration smoke checks.
- Create: `src/admin/pages/KnowledgePage.tsx` for knowledge management.
- Create: `src/admin/pages/OntologyPage.tsx` for graph path inspection.
- Create: `src/admin/pages/TestBenchPage.tsx` for manual four-pillar input.
- Modify: `src/admin/components/AdminLayout.tsx` to add knowledge menu entries.
- Modify: `src/admin/AdminApp.tsx` to route new admin pages.
- Create: `tests/test_phase2_knowledge_scaffold.py` for frontend/backend scaffold checks.

---

### Task 1: Add Neo4j Configuration And Dependency

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Add Neo4j dependency**

Update `package.json` dependencies:

```json
{
  "dependencies": {
    "neo4j-driver": "^5.28.1"
  }
}
```

Keep existing dependencies.

- [ ] **Step 2: Add environment variables**

Append to `.env.example`:

```env
NEO4J_URI="bolt://127.0.0.1:7687"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="CHANGE_ME"
NEO4J_DATABASE="neo4j"
```

- [ ] **Step 3: Install and verify**

Run:

```powershell
npm install
npm run lint
```

Expected: dependency installs and TypeScript exits with code 0 after Phase 1 files exist.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json .env.example
git commit -m "chore: add neo4j configuration"
```

---

### Task 2: Add Knowledge Database Schema

**Files:**
- Create: `server/db/migrations/002_phase2_knowledge.sql`
- Test: `server/tests/knowledge-schema.test.mjs`

- [ ] **Step 1: Write schema smoke test**

Create `server/tests/knowledge-schema.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('phase 2 migration defines knowledge tables and publish state', async () => {
  const sql = await fs.readFile(new URL('../db/migrations/002_phase2_knowledge.sql', import.meta.url), 'utf8');
  for (const phrase of [
    'create table if not exists app.knowledge_sources',
    'create table if not exists app.knowledge_entries',
    'create table if not exists app.knowledge_entry_versions',
    "status text not null default 'draft'",
    "check (status in ('draft', 'published', 'disabled'))",
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```powershell
npm run test:server
```

Expected: FAIL because `002_phase2_knowledge.sql` does not exist.

- [ ] **Step 3: Create migration**

Create `server/db/migrations/002_phase2_knowledge.sql`:

```sql
create table if not exists app.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  source_type text not null default 'manual' check (source_type in ('manual', 'book', 'article', 'course', 'internal')),
  reference_url text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'bazi',
  title text not null,
  summary text not null default '',
  body text not null,
  tags text[] not null default '{}',
  source_id uuid references app.knowledge_sources(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  risk_note text not null default '',
  created_by uuid references app.users(id) on delete set null,
  published_by uuid references app.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.knowledge_entry_versions (
  id uuid primary key default gen_random_uuid(),
  knowledge_entry_id uuid not null references app.knowledge_entries(id) on delete cascade,
  version_no integer not null,
  snapshot jsonb not null,
  created_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (knowledge_entry_id, version_no)
);

create index if not exists knowledge_entries_module_status_idx
  on app.knowledge_entries(module, status);

create index if not exists knowledge_entries_tags_idx
  on app.knowledge_entries using gin(tags);
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/db/migrations/002_phase2_knowledge.sql server/tests/knowledge-schema.test.mjs
git commit -m "feat: add knowledge schema"
```

---

### Task 3: Add Bazi Ontology Seed

**Files:**
- Create: `server/graph/bazi-seed-data.mjs`
- Create: `server/graph/neo4j-driver.mjs`
- Create: `server/graph/seed-bazi-ontology.mjs`
- Test: `server/tests/bazi-seed.test.mjs`

- [ ] **Step 1: Write seed integrity test**

Create `server/tests/bazi-seed.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { heavenlyStems, earthlyBranches, fiveElements, tenGods } from '../graph/bazi-seed-data.mjs';

test('bazi seed contains canonical concept counts', () => {
  assert.equal(heavenlyStems.length, 10);
  assert.equal(earthlyBranches.length, 12);
  assert.equal(fiveElements.length, 5);
  assert.equal(tenGods.length, 10);
});

test('bazi seed keeps stable keys', () => {
  assert.deepEqual(fiveElements.map((item) => item.key), ['wood', 'fire', 'earth', 'metal', 'water']);
  assert.equal(heavenlyStems[0].label, '甲');
  assert.equal(earthlyBranches[0].label, '子');
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```powershell
npm run test:server
```

Expected: FAIL because seed data file does not exist.

- [ ] **Step 3: Create seed data**

Create `server/graph/bazi-seed-data.mjs` with arrays:

```js
export const fiveElements = [
  { key: 'wood', label: '木' },
  { key: 'fire', label: '火' },
  { key: 'earth', label: '土' },
  { key: 'metal', label: '金' },
  { key: 'water', label: '水' },
];

export const heavenlyStems = [
  { key: 'jia', label: '甲', element: 'wood', polarity: 'yang' },
  { key: 'yi', label: '乙', element: 'wood', polarity: 'yin' },
  { key: 'bing', label: '丙', element: 'fire', polarity: 'yang' },
  { key: 'ding', label: '丁', element: 'fire', polarity: 'yin' },
  { key: 'wu', label: '戊', element: 'earth', polarity: 'yang' },
  { key: 'ji', label: '己', element: 'earth', polarity: 'yin' },
  { key: 'geng', label: '庚', element: 'metal', polarity: 'yang' },
  { key: 'xin', label: '辛', element: 'metal', polarity: 'yin' },
  { key: 'ren', label: '壬', element: 'water', polarity: 'yang' },
  { key: 'gui', label: '癸', element: 'water', polarity: 'yin' },
];

export const earthlyBranches = [
  { key: 'zi', label: '子', element: 'water' },
  { key: 'chou', label: '丑', element: 'earth' },
  { key: 'yin', label: '寅', element: 'wood' },
  { key: 'mao', label: '卯', element: 'wood' },
  { key: 'chen', label: '辰', element: 'earth' },
  { key: 'si', label: '巳', element: 'fire' },
  { key: 'wu_branch', label: '午', element: 'fire' },
  { key: 'wei', label: '未', element: 'earth' },
  { key: 'shen', label: '申', element: 'metal' },
  { key: 'you', label: '酉', element: 'metal' },
  { key: 'xu', label: '戌', element: 'earth' },
  { key: 'hai', label: '亥', element: 'water' },
];

export const tenGods = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']
  .map((label) => ({ key: label, label }));
```

- [ ] **Step 4: Create Neo4j driver module**

Create `server/graph/neo4j-driver.mjs`:

```js
import neo4j from 'neo4j-driver';
import { loadConfig } from '../config.mjs';

export function createNeo4jDriver(config = loadConfig()) {
  if (!config.neo4jUri || !config.neo4jUsername || !config.neo4jPassword) {
    throw new Error('Neo4j configuration is required');
  }
  return neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword));
}
```

Also extend `server/config.mjs` with `neo4jUri`, `neo4jUsername`, `neo4jPassword`, and `neo4jDatabase`.

- [ ] **Step 5: Create idempotent seed script**

Create `server/graph/seed-bazi-ontology.mjs` that opens a Neo4j session and uses `MERGE` for:

```cypher
MERGE (:Concept {key: $key})
SET label = $label, type = $type
```

Seed concept types: `FiveElement`, `HeavenlyStem`, `EarthlyBranch`, `TenGod`. Seed element relationships using `BELONGS_TO`.

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add server/graph server/config.mjs server/tests/bazi-seed.test.mjs
git commit -m "feat: seed bazi ontology"
```

---

### Task 4: Add Knowledge And Graph APIs

**Files:**
- Create: `server/routes/knowledge-routes.mjs`
- Create: `server/routes/graph-routes.mjs`
- Create: `server/routes/testbench-routes.mjs`
- Modify: `server/app.mjs`
- Test: `server/tests/app-routes.test.mjs`

- [ ] **Step 1: Add route presence tests**

Append tests that assert these routes reject unauthenticated requests with 401 when mounted:

```text
GET /destiny-api/admin/knowledge
POST /destiny-api/admin/knowledge
GET /destiny-api/admin/graph/concepts
POST /destiny-api/admin/testbench/four-pillars
```

- [ ] **Step 2: Create knowledge routes**

Create admin-protected endpoints:

```text
GET    /destiny-api/admin/knowledge?module=bazi&status=draft
POST   /destiny-api/admin/knowledge
GET    /destiny-api/admin/knowledge/:id
PATCH  /destiny-api/admin/knowledge/:id
POST   /destiny-api/admin/knowledge/:id/publish
POST   /destiny-api/admin/knowledge/:id/disable
```

Rules:

- Editors can create and update drafts.
- Admins can publish and disable.
- Every publish writes a row into `app.knowledge_entry_versions`.

- [ ] **Step 3: Create graph routes**

Create admin-protected endpoints:

```text
GET /destiny-api/admin/graph/concepts?type=HeavenlyStem
GET /destiny-api/admin/graph/concepts/:key/paths
GET /destiny-api/admin/graph/health
```

The path endpoint returns:

```json
{
  "concept": {"key": "jia", "label": "甲"},
  "paths": [
    {"nodes": ["甲", "木"], "relationships": ["BELONGS_TO"]}
  ]
}
```

- [ ] **Step 4: Create manual test bench route**

Create:

```text
POST /destiny-api/admin/testbench/four-pillars
```

Request:

```json
{
  "year": {"stem": "甲", "branch": "子"},
  "month": {"stem": "丙", "branch": "寅"},
  "day": {"stem": "戊", "branch": "辰"},
  "hour": {"stem": "庚", "branch": "申"}
}
```

Response:

```json
{
  "pillars": ["甲子", "丙寅", "戊辰", "庚申"],
  "elements": {"木": 2, "火": 1, "土": 2, "金": 2, "水": 1},
  "warnings": []
}
```

- [ ] **Step 5: Mount routes and run tests**

Modify `server/app.mjs` to mount the three route modules inside the admin-protected server setup.

Run:

```powershell
npm run test:server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/routes/knowledge-routes.mjs server/routes/graph-routes.mjs server/routes/testbench-routes.mjs server/app.mjs server/tests/app-routes.test.mjs
git commit -m "feat: add knowledge graph api"
```

---

### Task 5: Add Admin Knowledge UI

**Files:**
- Create: `src/admin/pages/KnowledgePage.tsx`
- Create: `src/admin/pages/OntologyPage.tsx`
- Create: `src/admin/pages/TestBenchPage.tsx`
- Modify: `src/admin/components/AdminLayout.tsx`
- Modify: `src/admin/AdminApp.tsx`
- Test: `tests/test_phase2_knowledge_scaffold.py`

- [ ] **Step 1: Create scaffold test**

Create `tests/test_phase2_knowledge_scaffold.py`:

```python
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Phase2KnowledgeScaffoldTests(unittest.TestCase):
    def test_admin_knowledge_pages_exist(self):
        for relative in [
            "src/admin/pages/KnowledgePage.tsx",
            "src/admin/pages/OntologyPage.tsx",
            "src/admin/pages/TestBenchPage.tsx",
        ]:
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_admin_navigation_contains_knowledge_sections(self):
        layout = (ROOT / "src" / "admin" / "components" / "AdminLayout.tsx").read_text(encoding="utf-8")
        for label in ["八字本体图谱", "知识条目", "测试台"]:
            self.assertIn(label, layout)
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```powershell
python -m unittest tests.test_phase2_knowledge_scaffold
```

Expected: FAIL because pages do not exist.

- [ ] **Step 3: Create pages**

Create pages with these first-version panels:

- `KnowledgePage.tsx`: list filter by status, title/body form, save draft, publish button disabled unless role is admin.
- `OntologyPage.tsx`: concept type filter, concept list, selected concept path panel.
- `TestBenchPage.tsx`: four pillar inputs and element distribution result.

- [ ] **Step 4: Wire navigation**

Add layout entries:

```text
八字本体图谱
知识条目
测试台
```

Route them in `AdminApp.tsx`.

- [ ] **Step 5: Run checks**

```powershell
python -m unittest tests.test_phase2_knowledge_scaffold
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/admin tests/test_phase2_knowledge_scaffold.py
git commit -m "feat: add knowledge admin pages"
```

---

## Acceptance Criteria

- PostgreSQL contains Phase 2 knowledge tables after migration.
- Neo4j seed script can be run repeatedly without duplicating concepts.
- Admin can create and edit knowledge drafts.
- Admin can inspect 八字 ontology concepts and graph paths.
- Test bench accepts manual four-pillar input and returns a structured element summary.
- All Phase 1 checks still pass.
