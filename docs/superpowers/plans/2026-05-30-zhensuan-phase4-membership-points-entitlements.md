# 甄算 阶段 4：会员、积分与权益实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建立客户价值账户体系：报告次数、付费会员、成长等级、积分余额、权益流水，以及报告生成时的次数校验和扣减。

**架构：** PostgreSQL 负责所有余额和不可变流水。任何权益、积分、会员状态变化都必须通过服务函数写入流水，不能直接改余额。报告生成前检查权益，报告成功后扣减次数。

**技术栈：** Node.js ESM、Express、PostgreSQL、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- 会员套餐表。
- 客户会员状态表。
- 报告次数账户和流水。
- 积分账户和流水。
- 成长等级计算。
- 后台手动发放报告次数、积分、会员。
- 客户查看会员、次数、积分和成长等级。
- 报告生成时校验并扣减次数。

本阶段不做：

- 商品购买。
- 支付订单。
- 微信支付回调。
- 优惠券和营销活动。

## 文件结构

- 新建：`server/db/migrations/004_phase4_membership_entitlements.sql`
- 新建：`server/entitlements/ledger-service.mjs`
- 新建：`server/entitlements/membership-service.mjs`
- 新建：`server/entitlements/growth-service.mjs`
- 新建：`server/routes/entitlement-routes.mjs`
- 修改：`server/reports/report-service.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/entitlements.test.mjs`
- 新建：`src/admin/pages/MembershipPage.tsx`
- 新建：`src/admin/pages/EntitlementsPage.tsx`
- 新建：`src/admin/pages/PointsPage.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 新建测试：`tests/test_phase4_entitlements_scaffold.py`

---

## 任务 1：会员和权益数据库表

**文件：**
- 新建：`server/db/migrations/004_phase4_membership_entitlements.sql`
- 新建测试：`server/tests/entitlements.test.mjs`

- [ ] **步骤 1：迁移测试**

检查 SQL 中存在：

```text
app.membership_plans
app.customer_memberships
app.entitlement_accounts
app.entitlement_ledger
app.points_accounts
app.points_ledger
```

- [ ] **步骤 2：会员表**

`membership_plans` 字段：

- `code`
- `name`
- `duration_days`
- `monthly_report_quota`
- `benefits`
- `status`

`customer_memberships` 字段：

- `customer_id`
- `plan_code`
- `starts_at`
- `expires_at`
- `status`
- `source`

- [ ] **步骤 3：权益账户和流水**

`entitlement_accounts` 保存：

- `customer_id`
- `report_quota_balance`
- `updated_at`

`entitlement_ledger` 保存：

- 变化数量。
- 变化后余额。
- 原因。
- 关联对象类型和 ID。
- 操作人。

- [ ] **步骤 4：积分账户和流水**

`points_accounts` 保存：

- 当前积分。
- 累计积分。
- 成长等级。

`points_ledger` 保存每一次积分变化。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/db/migrations/004_phase4_membership_entitlements.sql server/tests/entitlements.test.mjs
git commit -m "feat: add membership entitlement schema"
```

---

## 任务 2：权益和积分服务

**文件：**
- 新建：`server/entitlements/ledger-service.mjs`
- 新建：`server/entitlements/growth-service.mjs`
- 修改测试：`server/tests/entitlements.test.mjs`

- [ ] **步骤 1：成长等级规则**

第一版：

```text
0      -> 启蒙
100    -> 入门
500    -> 明理
2000   -> 通达
8000   -> 参玄
```

- [ ] **步骤 2：报告次数服务**

实现：

```js
grantReportQuota(client, { customerId, amount, reason, referenceType, referenceId, actorUserId })
spendReportQuota(client, { customerId, amount, reason, referenceType, referenceId })
```

要求：

- 发放和扣减都写流水。
- 扣减时余额不足抛出 `INSUFFICIENT_REPORT_QUOTA`。
- 余额和流水必须在同一个事务里完成。

- [ ] **步骤 3：积分服务**

实现：

```js
grantPoints(client, { customerId, amount, reason, referenceType, referenceId, actorUserId })
```

要求：

- 写积分流水。
- 更新当前积分。
- 更新累计积分。
- 根据累计积分更新成长等级。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/entitlements server/tests/entitlements.test.mjs
git commit -m "feat: add entitlement ledger services"
```

---

## 任务 3：权益接口

**文件：**
- 新建：`server/routes/entitlement-routes.mjs`
- 新建：`server/entitlements/membership-service.mjs`
- 修改：`server/app.mjs`

- [ ] **步骤 1：客户价值状态服务**

`getCustomerValueState(pool, customerId)` 返回：

```json
{
  "membership": null,
  "reportQuotaBalance": 0,
  "points": {
    "points_balance": 0,
    "lifetime_points": 0,
    "growth_level": "启蒙"
  }
}
```

- [ ] **步骤 2：客户接口**

```text
GET /destiny-api/customer/value-state
```

必须要求客户 session。

- [ ] **步骤 3：后台接口**

```text
GET  /destiny-api/admin/customers/:customerId/value-state
POST /destiny-api/admin/customers/:customerId/grant-quota
POST /destiny-api/admin/customers/:customerId/grant-points
POST /destiny-api/admin/customers/:customerId/grant-membership
```

要求：

- 需要后台 admin 权限。
- 手动发放必须写流水和审计日志。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/routes/entitlement-routes.mjs server/entitlements/membership-service.mjs server/app.mjs
git commit -m "feat: add entitlement api"
```

---

## 任务 4：报告生成扣减次数

**文件：**
- 修改：`server/reports/report-service.mjs`
- 修改：`server/routes/report-routes.mjs`
- 修改测试：`server/tests/entitlements.test.mjs`

- [ ] **步骤 1：生成前校验**

带客户 session 的报告生成必须先检查：

```text
report_quota_balance >= 1
```

不足时返回：

```json
{
  "error": "INSUFFICIENT_REPORT_QUOTA",
  "message": "报告次数不足"
}
```

HTTP 状态码：`402`。

- [ ] **步骤 2：生成后扣减**

报告成功返回给客户后扣减 1 次，流水：

```text
reference_type = report_run
reference_id = report_run.id
reason = report_generated
```

如果模型失败但 fallback 报告成功返回，也算成功生成，需要扣减。

- [ ] **步骤 3：测试并提交**

```powershell
npm run test:server
git add server/reports/report-service.mjs server/routes/report-routes.mjs server/tests/entitlements.test.mjs
git commit -m "feat: enforce report quota"
```

---

## 任务 5：后台会员和权益页面

**文件：**
- 新建：`src/admin/pages/MembershipPage.tsx`
- 新建：`src/admin/pages/EntitlementsPage.tsx`
- 新建：`src/admin/pages/PointsPage.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 新建测试：`tests/test_phase4_entitlements_scaffold.py`

- [ ] **步骤 1：新增菜单**

后台菜单加入：

```text
会员管理
权益账户
积分账户
```

- [ ] **步骤 2：会员管理页**

展示：

- 会员套餐。
- 客户当前会员。
- 手动发放会员。

- [ ] **步骤 3：权益账户页**

展示：

- 报告次数余额。
- 发放记录。
- 扣减记录。
- 手动发放表单。

- [ ] **步骤 4：积分账户页**

展示：

- 当前积分。
- 累计积分。
- 成长等级。
- 积分流水。

- [ ] **步骤 5：检查并提交**

```powershell
python -m unittest tests.test_phase4_entitlements_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase4_entitlements_scaffold.py
git commit -m "feat: add value accounting admin"
```

## 验收标准

- 每个客户可以拥有权益账户和积分账户。
- 后台手动发放会写流水。
- 报告次数不足时无法生成付费报告。
- 报告成功生成后扣减 1 次。
- 成长等级根据累计积分更新。
- 客户可以查看会员状态、报告次数、积分和成长等级。
