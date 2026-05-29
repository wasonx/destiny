# 甄算 阶段 5：轻商城与支付预留实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建立虚拟商品商城基础能力：商品映射、订单、支付单状态机、人工标记支付成功、支付成功后自动发放权益，并为微信支付真实接入预留接口。

**架构：** MedusaJS 作为商品和订单底座的边界，甄算本地保留订单、支付和权益发放镜像，确保报告次数、会员和数字内容发放可审计。第一版支付只做人工确认和微信支付占位，不接真实微信支付签名和回调。

**技术栈：** Node.js ESM、Express、PostgreSQL、MedusaJS、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- 商品映射：报告次数包、月度会员、年度会员、数字内容。
- 本地订单表。
- 支付单表。
- 支付状态机。
- 人工标记支付成功。
- 微信支付 placeholder provider。
- 支付成功后自动发放权益。
- 后台商品、订单、支付、发放记录页面。

本阶段不做：

- 真实微信支付签名。
- 真实微信支付回调。
- 退款。
- 优惠券。
- 物流、实物商品、收货地址。

## 文件结构

- 新建：`server/db/migrations/005_phase5_commerce_payment.sql`
- 新建：`server/commerce/product-mapping-service.mjs`
- 新建：`server/commerce/order-service.mjs`
- 新建：`server/commerce/payment-state-machine.mjs`
- 新建：`server/commerce/payment-providers/manual-provider.mjs`
- 新建：`server/commerce/payment-providers/wechat-placeholder-provider.mjs`
- 新建：`server/commerce/delivery-service.mjs`
- 新建：`server/routes/commerce-routes.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/commerce.test.mjs`
- 新建：`src/admin/pages/ProductsPage.tsx`
- 新建：`src/admin/pages/OrdersPage.tsx`
- 新建：`src/admin/pages/PaymentsPage.tsx`
- 新建：`src/admin/pages/DeliveryLogsPage.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 新建测试：`tests/test_phase5_commerce_scaffold.py`

---

## 任务 1：商城和支付数据库表

**文件：**
- 新建：`server/db/migrations/005_phase5_commerce_payment.sql`
- 新建测试：`server/tests/commerce.test.mjs`

- [ ] **步骤 1：迁移测试**

检查 SQL 中存在：

```text
app.commerce_products
app.commerce_orders
app.payment_intents
app.entitlement_deliveries
```

- [ ] **步骤 2：商品表**

`commerce_products` 字段：

- `medusa_product_id`
- `sku`
- `name`
- `product_type`
- `price_cents`
- `currency`
- `entitlement_payload`
- `status`

商品类型：

```text
report_quota
monthly_membership
yearly_membership
digital_content
```

- [ ] **步骤 3：订单和支付表**

`commerce_orders` 保存：

- 客户。
- 订单号。
- 状态。
- 金额。
- 商品明细。

`payment_intents` 保存：

- 订单。
- 支付提供方。
- 支付状态。
- 金额。
- provider payload。
- 支付时间。

- [ ] **步骤 4：权益发放表**

`entitlement_deliveries` 保存每个订单商品发放记录，避免重复发放。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/db/migrations/005_phase5_commerce_payment.sql server/tests/commerce.test.mjs
git commit -m "feat: add commerce payment schema"
```

---

## 任务 2：商品映射和支付状态机

**文件：**
- 新建：`server/commerce/product-mapping-service.mjs`
- 新建：`server/commerce/payment-state-machine.mjs`
- 修改测试：`server/tests/commerce.test.mjs`

- [ ] **步骤 1：支付状态机**

允许流转：

```text
created -> pending
created -> cancelled
pending -> paid
pending -> failed
pending -> cancelled
failed -> pending
```

不允许：

```text
paid -> pending
paid -> failed
cancelled -> paid
```

- [ ] **步骤 2：商品权益映射**

`buildEntitlementPayload(product)` 根据商品类型返回：

```text
report_quota       -> reportQuota
monthly_membership -> membershipPlan monthly + durationDays 31
yearly_membership  -> membershipPlan yearly + durationDays 365
digital_content    -> digitalContentSku
```

- [ ] **步骤 3：测试并提交**

```powershell
npm run test:server
git add server/commerce/product-mapping-service.mjs server/commerce/payment-state-machine.mjs server/tests/commerce.test.mjs
git commit -m "feat: add commerce state helpers"
```

---

## 任务 3：订单、支付提供方和权益发放

**文件：**
- 新建：`server/commerce/order-service.mjs`
- 新建：`server/commerce/payment-providers/manual-provider.mjs`
- 新建：`server/commerce/payment-providers/wechat-placeholder-provider.mjs`
- 新建：`server/commerce/delivery-service.mjs`

- [ ] **步骤 1：人工支付提供方**

`manual-provider.mjs` 返回：

```json
{
  "provider": "manual",
  "status": "pending",
  "providerPayload": {
    "instruction": "人工确认收款后标记为已支付"
  }
}
```

- [ ] **步骤 2：微信支付占位提供方**

`wechat-placeholder-provider.mjs` 返回：

```json
{
  "provider": "wechat_placeholder",
  "status": "created",
  "providerPayload": {
    "disabledReason": "微信支付真实接口尚未接入"
  }
}
```

- [ ] **步骤 3：权益发放服务**

`delivery-service.mjs` 根据商品类型执行：

- 次数包：调用 `grantReportQuota`。
- 月度会员：写入 `customer_memberships`，31 天。
- 年度会员：写入 `customer_memberships`，365 天。
- 数字内容：写入数字内容解锁记录或先写发放日志。
- 消费积分：按金额发放积分。

- [ ] **步骤 4：订单服务**

`order-service.mjs` 提供：

```js
createOrder(client, { customerId, items })
createPaymentIntent(client, { orderId, provider })
markPaymentPaid(client, { paymentIntentId, actorUserId })
```

`markPaymentPaid` 必须在一个事务内：

1. 校验支付单状态。
2. 更新支付单为 `paid`。
3. 更新订单为 `paid`。
4. 发放权益。
5. 写审计日志。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/commerce
git commit -m "feat: add commerce order delivery services"
```

---

## 任务 4：商城接口

**文件：**
- 新建：`server/routes/commerce-routes.mjs`
- 修改：`server/app.mjs`

- [ ] **步骤 1：客户接口**

```text
GET  /destiny-api/customer/products
POST /destiny-api/customer/orders
GET  /destiny-api/customer/orders
GET  /destiny-api/customer/orders/:id
```

要求：

- 只展示启用的虚拟商品。
- 客户只能查看自己的订单。

- [ ] **步骤 2：后台接口**

```text
GET   /destiny-api/admin/products
POST  /destiny-api/admin/products
PATCH /destiny-api/admin/products/:id
GET   /destiny-api/admin/orders
GET   /destiny-api/admin/payments
POST  /destiny-api/admin/payments/:id/mark-paid
GET   /destiny-api/admin/delivery-logs
```

要求：

- 标记支付成功必须是管理员。
- 已支付或已取消的支付单不能再次标记。

- [ ] **步骤 3：测试并提交**

```powershell
npm run test:server
git add server/routes/commerce-routes.mjs server/app.mjs
git commit -m "feat: add commerce api"
```

---

## 任务 5：后台商城页面

**文件：**
- 新建：`src/admin/pages/ProductsPage.tsx`
- 新建：`src/admin/pages/OrdersPage.tsx`
- 新建：`src/admin/pages/PaymentsPage.tsx`
- 新建：`src/admin/pages/DeliveryLogsPage.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 新建测试：`tests/test_phase5_commerce_scaffold.py`

- [ ] **步骤 1：新增菜单**

后台菜单加入：

```text
商品管理
订单管理
支付管理
发放记录
```

- [ ] **步骤 2：商品管理页**

展示：

- SKU。
- 商品名称。
- 商品类型。
- 价格。
- 权益 payload。
- 启用状态。

- [ ] **步骤 3：订单和支付页**

订单页展示客户、金额、状态、商品明细。支付页展示支付单状态，并提供人工标记支付成功入口。

- [ ] **步骤 4：发放记录页**

展示每个订单商品对应的权益发放结果。

- [ ] **步骤 5：检查并提交**

```powershell
python -m unittest tests.test_phase5_commerce_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase5_commerce_scaffold.py
git commit -m "feat: add commerce admin pages"
```

## 验收标准

- 后台可以配置虚拟商品和权益 payload。
- 客户可以创建虚拟商品订单。
- 人工标记支付成功后，订单和支付单都变成已支付。
- 已支付订单会自动发放权益，且不会重复发放。
- 微信支付只作为占位 provider 出现，不引入真实密钥。
- 系统不包含实物商品、物流和收货地址逻辑。
