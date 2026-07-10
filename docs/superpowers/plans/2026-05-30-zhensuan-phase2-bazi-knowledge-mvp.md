# 甄好算 阶段 2：八字知识库 MVP 实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建立第一版可维护的八字知识库，让后台能管理知识条目，Neo4j 能承载基础本体图谱，测试台能手动输入四柱并查看结构化结果。

**架构：** PostgreSQL 存知识条目、来源、版本和发布状态；Neo4j 存八字概念节点和关系路径；Express 提供后台 CRUD、图谱查询和测试台 API；React Admin 提供知识编辑、图谱查看和四柱测试页面。

**技术栈：** Node.js ESM、Express、PostgreSQL、Neo4j Community、Cypher、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- Neo4j 连接配置和健康检查。
- PostgreSQL 知识库基础表。
- 八字本体种子数据：天干、地支、五行、阴阳、十神、四柱、藏干、合冲刑害破等基础关系。
- 知识条目后台管理。
- 图谱概念和路径查看接口。
- 手动四柱测试台。

本阶段不做：

- 规则评分。
- 最终报告生成。
- 会员权益。
- 商城和支付。

## 文件结构

- 修改：`.env.example`，新增 Neo4j 配置。
- 修改：`package.json`，新增 `neo4j-driver`。
- 新建：`server/db/migrations/002_phase2_knowledge.sql`。
- 新建：`server/graph/neo4j-driver.mjs`。
- 新建：`server/graph/bazi-seed-data.mjs`。
- 新建：`server/graph/seed-bazi-ontology.mjs`。
- 新建：`server/routes/knowledge-routes.mjs`。
- 新建：`server/routes/graph-routes.mjs`。
- 新建：`server/routes/testbench-routes.mjs`。
- 修改：`server/app.mjs`。
- 新建测试：`server/tests/bazi-seed.test.mjs`。
- 新建测试：`server/tests/knowledge-schema.test.mjs`。
- 新建：`src/admin/pages/KnowledgePage.tsx`。
- 新建：`src/admin/pages/OntologyPage.tsx`。
- 新建：`src/admin/pages/TestBenchPage.tsx`。
- 修改：`src/admin/components/AdminLayout.tsx`。
- 修改：`src/admin/AdminApp.tsx`。
- 新建测试：`tests/test_phase2_knowledge_scaffold.py`。

---

## 任务 1：新增 Neo4j 配置

**文件：**
- 修改：`package.json`
- 修改：`.env.example`

- [ ] **步骤 1：新增依赖**

```json
{
  "dependencies": {
    "neo4j-driver": "^5.28.1"
  }
}
```

- [ ] **步骤 2：新增环境变量**

```env
NEO4J_URI="bolt://127.0.0.1:7687"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="CHANGE_ME"
NEO4J_DATABASE="neo4j"
```

- [ ] **步骤 3：安装和检查**

```powershell
npm install
npm run lint
```

- [ ] **步骤 4：提交**

```powershell
git add package.json package-lock.json .env.example
git commit -m "chore: add neo4j configuration"
```

---

## 任务 2：知识库数据库表

**文件：**
- 新建：`server/db/migrations/002_phase2_knowledge.sql`
- 新建测试：`server/tests/knowledge-schema.test.mjs`

- [ ] **步骤 1：创建迁移测试**

检查 SQL 中必须包含：

```text
app.knowledge_sources
app.knowledge_entries
app.knowledge_entry_versions
draft / published / disabled
```

- [ ] **步骤 2：创建迁移**

`002_phase2_knowledge.sql` 必须包含：

```sql
create table if not exists app.knowledge_sources (...);
create table if not exists app.knowledge_entries (...);
create table if not exists app.knowledge_entry_versions (...);
```

`knowledge_entries` 关键字段：

- `module`
- `title`
- `summary`
- `body`
- `tags`
- `source_id`
- `status`
- `risk_note`
- `created_by`
- `published_by`
- `published_at`

- [ ] **步骤 3：运行测试**

```powershell
npm run test:server
```

- [ ] **步骤 4：提交**

```powershell
git add server/db/migrations/002_phase2_knowledge.sql server/tests/knowledge-schema.test.mjs
git commit -m "feat: add knowledge schema"
```

---

## 任务 3：八字本体种子数据

**文件：**
- 新建：`server/graph/bazi-seed-data.mjs`
- 新建：`server/graph/neo4j-driver.mjs`
- 新建：`server/graph/seed-bazi-ontology.mjs`
- 新建测试：`server/tests/bazi-seed.test.mjs`

- [ ] **步骤 1：种子数据测试**

检查数量：

```text
天干 10
地支 12
五行 5
十神 10
```

- [ ] **步骤 2：创建种子数据**

`bazi-seed-data.mjs` 至少导出：

```js
heavenlyStems
earthlyBranches
fiveElements
tenGods
```

每个概念要有稳定 `key` 和中文 `label`。

- [ ] **步骤 3：创建 Neo4j 连接模块**

`neo4j-driver.mjs` 从配置读取：

```text
NEO4J_URI
NEO4J_USERNAME
NEO4J_PASSWORD
NEO4J_DATABASE
```

- [ ] **步骤 4：创建种子脚本**

`seed-bazi-ontology.mjs` 用 `MERGE` 写入节点，保证重复执行不重复创建：

```cypher
MERGE (c:Concept {key: $key})
SET c.label = $label, c.type = $type
```

第一版关系包括：

- 天干、地支 `BELONGS_TO` 五行。
- 五行 `GENERATES` 相生。
- 五行 `RESTRAINS` 相克。
- 地支基础 `CONFLICTS_WITH` 冲。
- 概念归类关系。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/graph server/config.mjs server/tests/bazi-seed.test.mjs
git commit -m "feat: seed bazi ontology"
```

---

## 任务 4：知识库和图谱 API

**文件：**
- 新建：`server/routes/knowledge-routes.mjs`
- 新建：`server/routes/graph-routes.mjs`
- 新建：`server/routes/testbench-routes.mjs`
- 修改：`server/app.mjs`
- 修改测试：`server/tests/app-routes.test.mjs`

- [ ] **步骤 1：知识条目接口**

后台鉴权接口：

```text
GET    /destiny-api/admin/knowledge
POST   /destiny-api/admin/knowledge
GET    /destiny-api/admin/knowledge/:id
PATCH  /destiny-api/admin/knowledge/:id
POST   /destiny-api/admin/knowledge/:id/publish
POST   /destiny-api/admin/knowledge/:id/disable
```

权限：

- 编辑人员可以创建和修改草稿。
- 平台管理员可以发布和停用。
- 发布时写入 `knowledge_entry_versions`。

- [ ] **步骤 2：图谱接口**

后台鉴权接口：

```text
GET /destiny-api/admin/graph/concepts
GET /destiny-api/admin/graph/concepts/:key/paths
GET /destiny-api/admin/graph/health
```

路径接口返回概念、节点列表和关系列表。

- [ ] **步骤 3：手动四柱测试台接口**

```text
POST /destiny-api/admin/testbench/four-pillars
```

请求示例：

```json
{
  "year": {"stem": "甲", "branch": "子"},
  "month": {"stem": "丙", "branch": "寅"},
  "day": {"stem": "戊", "branch": "辰"},
  "hour": {"stem": "庚", "branch": "申"}
}
```

返回：

```json
{
  "pillars": ["甲子", "丙寅", "戊辰", "庚申"],
  "elements": {"木": 2, "火": 1, "土": 2, "金": 2, "水": 1},
  "warnings": []
}
```

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/routes/knowledge-routes.mjs server/routes/graph-routes.mjs server/routes/testbench-routes.mjs server/app.mjs server/tests/app-routes.test.mjs
git commit -m "feat: add knowledge graph api"
```

---

## 任务 5：后台知识库页面

**文件：**
- 新建：`src/admin/pages/KnowledgePage.tsx`
- 新建：`src/admin/pages/OntologyPage.tsx`
- 新建：`src/admin/pages/TestBenchPage.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 新建测试：`tests/test_phase2_knowledge_scaffold.py`

- [ ] **步骤 1：新增菜单**

后台菜单加入：

```text
八字本体图谱
知识条目
测试台
```

- [ ] **步骤 2：知识条目页**

功能：

- 按状态筛选：草稿、已发布、已停用。
- 新建草稿。
- 编辑标题、摘要、正文、标签、来源、风险提示。
- 保存草稿。
- 管理员发布或停用。

- [ ] **步骤 3：本体图谱页**

功能：

- 按概念类型筛选。
- 查看概念列表。
- 点击概念后查看关系路径。

- [ ] **步骤 4：测试台页**

功能：

- 手动输入年柱、月柱、日柱、时柱。
- 调用测试台接口。
- 展示五行统计、命中概念和警告。

- [ ] **步骤 5：检查并提交**

```powershell
python -m unittest tests.test_phase2_knowledge_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase2_knowledge_scaffold.py
git commit -m "feat: add knowledge admin pages"
```

## 验收标准

- PostgreSQL 有知识库相关表。
- Neo4j 种子脚本可重复执行，不重复创建概念。
- 后台能创建、编辑、发布、停用知识条目。
- 后台能查看八字本体概念和图谱路径。
- 测试台能手动输入四柱并返回结构化五行摘要。
- 阶段 1 的测试仍然通过。
