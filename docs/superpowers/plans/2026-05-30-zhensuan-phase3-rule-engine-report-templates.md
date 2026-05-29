# 甄算 阶段 3：规则引擎与报告模板实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建立半自动规则引擎和报告模板系统，让本地知识库、图谱路径和规则命中结果可以生成安全、可解释、亲民的报告。

**架构：** PostgreSQL 存分析规则、报告模板、报告生成记录和安全审查结果。规则引擎先产出结构化结论，大模型只负责组织和表达。每份报告都保留规则命中、知识引用、图谱路径、模板段落和安全审查记录。

**技术栈：** Node.js ESM、Express、PostgreSQL、Neo4j、在线大模型 API、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- 分析规则表。
- 报告模板表。
- 八字 MVP 特征条件判断器。
- 规则命中和排序。
- 模板段落编辑和预览。
- 大模型上下文拼装。
- 安全审查。
- 报告历史保存和后台查看。

本阶段不做：

- 会员扣费。
- 商城订单。
- 真实联网搜索。

## 文件结构

- 新建：`server/db/migrations/003_phase3_rules_reports.sql`
- 新建：`server/rules/condition-evaluator.mjs`
- 新建：`server/rules/rule-engine.mjs`
- 新建：`server/reports/context-builder.mjs`
- 新建：`server/reports/safety-review.mjs`
- 新建：`server/reports/report-service.mjs`
- 新建：`server/routes/rule-routes.mjs`
- 新建：`server/routes/template-routes.mjs`
- 新建：`server/routes/report-history-routes.mjs`
- 修改：`server/routes/report-routes.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/rule-engine.test.mjs`
- 新建测试：`server/tests/report-safety.test.mjs`
- 新建：`src/admin/pages/RulesPage.tsx`
- 新建：`src/admin/pages/TemplatesPage.tsx`
- 新建：`src/admin/pages/ReportRunsPage.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 新建测试：`tests/test_phase3_rules_scaffold.py`

---

## 任务 1：新增规则和报告数据库表

**文件：**
- 新建：`server/db/migrations/003_phase3_rules_reports.sql`
- 新建测试：`server/tests/rule-engine.test.mjs`

- [ ] **步骤 1：迁移测试**

检查 SQL 中包含：

```text
app.analysis_rules
app.report_templates
app.report_runs
app.safety_reviews
```

- [ ] **步骤 2：分析规则表**

`app.analysis_rules` 关键字段：

- `module`
- `name`
- `priority`
- `weight`
- `condition`
- `conclusion`
- `advice`
- `risk_boundary`
- `knowledge_entry_ids`
- `status`
- `created_by`
- `published_by`
- `published_at`

- [ ] **步骤 3：报告模板表**

`app.report_templates` 关键字段：

- `module`
- `name`
- `report_kind`
- `sections`
- `tone`
- `disclaimer`
- `forbidden_expressions`
- `status`

- [ ] **步骤 4：报告记录和安全审查表**

`app.report_runs` 保存：

- 客户。
- 报告类型。
- 输入参数。
- 结构化上下文。
- 最终报告 JSON。
- 来源：`fallback`、`ai`、`testbench`。

`app.safety_reviews` 保存：

- 是否通过。
- 风险 flags。
- 审查文本。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/db/migrations/003_phase3_rules_reports.sql server/tests/rule-engine.test.mjs
git commit -m "feat: add rule and report schema"
```

---

## 任务 2：规则条件判断器

**文件：**
- 新建：`server/rules/condition-evaluator.mjs`
- 新建：`server/rules/rule-engine.mjs`
- 修改测试：`server/tests/rule-engine.test.mjs`

- [ ] **步骤 1：支持条件结构**

第一版支持：

```json
{
  "all": [
    {"field": "elements.木", "operator": "gte", "value": 2}
  ]
}
```

以及：

```json
{
  "any": [
    {"field": "dayStem", "operator": "eq", "value": "甲"}
  ]
}
```

- [ ] **步骤 2：支持操作符**

第一版支持：

```text
eq
neq
gte
lte
includes
```

- [ ] **步骤 3：规则排序**

命中规则排序：

1. `priority` 数字越小越靠前。
2. `priority` 相同，`weight` 越高越靠前。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/rules server/tests/rule-engine.test.mjs
git commit -m "feat: add rule evaluator"
```

---

## 任务 3：报告上下文和安全审查

**文件：**
- 新建：`server/reports/context-builder.mjs`
- 新建：`server/reports/safety-review.mjs`
- 新建测试：`server/tests/report-safety.test.mjs`

- [ ] **步骤 1：上下文结构**

`buildReportContext` 输出必须包含：

```text
input
features
rules
knowledge
template
```

规则上下文包含：

- 规则 ID。
- 规则名称。
- 结论。
- 建议。
- 风险边界。
- 关联知识条目。

- [ ] **步骤 2：安全审查**

第一版先拦截绝对化和高风险词：

```text
一定
必定
保证
改命
转运
必然
```

命中后返回：

```json
{
  "passed": false,
  "flags": ["absolute_claim"]
}
```

- [ ] **步骤 3：测试并提交**

```powershell
npm run test:server
git add server/reports server/tests/report-safety.test.mjs
git commit -m "feat: add report context safety"
```

---

## 任务 4：规则、模板和报告接口

**文件：**
- 新建：`server/routes/rule-routes.mjs`
- 新建：`server/routes/template-routes.mjs`
- 新建：`server/routes/report-history-routes.mjs`
- 新建：`server/reports/report-service.mjs`
- 修改：`server/routes/report-routes.mjs`
- 修改：`server/app.mjs`

- [ ] **步骤 1：规则接口**

后台鉴权接口：

```text
GET    /destiny-api/admin/rules
POST   /destiny-api/admin/rules
PATCH  /destiny-api/admin/rules/:id
POST   /destiny-api/admin/rules/:id/publish
POST   /destiny-api/admin/rules/:id/disable
POST   /destiny-api/admin/rules/test
```

权限：

- 编辑人员可保存草稿和测试。
- 管理员可发布和停用。

- [ ] **步骤 2：模板接口**

```text
GET    /destiny-api/admin/templates
POST   /destiny-api/admin/templates
PATCH  /destiny-api/admin/templates/:id
POST   /destiny-api/admin/templates/:id/publish
POST   /destiny-api/admin/templates/:id/preview
```

模板预览只生成预览，不写入客户报告历史。

- [ ] **步骤 3：报告历史接口**

```text
GET /destiny-api/admin/report-runs
GET /destiny-api/admin/report-runs/:id
GET /destiny-api/customer/report-runs
```

客户接口只能读取当前客户自己的报告。

- [ ] **步骤 4：报告生成链路**

`/destiny-api/generate` 改为：

1. 校验输入。
2. 提取特征。
3. 读取已发布规则和模板。
4. 运行规则。
5. 拼装上下文。
6. 调用大模型或 fallback。
7. 安全审查。
8. 保存报告历史。
9. 返回报告。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
npm run lint
git add server/routes server/reports server/app.mjs
git commit -m "feat: add rule template report api"
```

---

## 任务 5：后台规则和模板页面

**文件：**
- 新建：`src/admin/pages/RulesPage.tsx`
- 新建：`src/admin/pages/TemplatesPage.tsx`
- 新建：`src/admin/pages/ReportRunsPage.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 新建测试：`tests/test_phase3_rules_scaffold.py`

- [ ] **步骤 1：新增菜单**

后台菜单加入：

```text
分析规则
报告模板
报告记录
```

- [ ] **步骤 2：规则页**

功能：

- 规则列表。
- JSON 条件编辑。
- 自然语言规则草稿输入区。
- 测试运行按钮。
- 命中结果展示。

- [ ] **步骤 3：模板页**

功能：

- 段落结构编辑。
- 语气字段。
- 免责声明字段。
- 禁用表达字段。
- 模板预览。

- [ ] **步骤 4：报告记录页**

功能：

- 报告列表。
- 输入参数。
- 命中规则。
- 安全审查 flags。
- 最终报告 JSON。

- [ ] **步骤 5：检查并提交**

```powershell
python -m unittest tests.test_phase3_rules_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase3_rules_scaffold.py
git commit -m "feat: add rule template admin"
```

## 验收标准

- 已发布知识和规则能生成结构化报告上下文。
- 规则按优先级和权重稳定排序。
- 模板能控制报告段落、语气、免责声明和禁用表达。
- 安全审查能阻止绝对化和高风险表达入库。
- 后台能创建、测试、发布、停用规则和模板。
- 客户能通过现有生成接口获得报告。
