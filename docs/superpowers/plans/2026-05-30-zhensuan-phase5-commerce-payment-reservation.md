# 甄算 阶段 5：轻商城与支付预留实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建立虚拟商品和实物商品的轻商城基础能力：商品映射、SKU 库存、收货地址、订单、支付单状态机、人工标记支付成功、人工发货、退款申请、支付成功后自动发放权益或进入实物履约，并为微信支付真实接入预留接口。

**架构：** MedusaJS 作为商品和订单底座的边界，甄算本地保留订单、支付、库存、发货、退款和权益发放镜像，确保虚拟权益发放和实物履约都可审计。第一版支付只做人工确认和微信支付占位，不接真实微信支付签名、回调和真实退款接口。

**技术栈：** Node.js ESM、Express、PostgreSQL、MedusaJS、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- 商品映射：报告次数包、月度会员、年度会员、数字内容、实物商品。
- SKU 库存。
- 客户收货地址。
- 本地订单表。
- 支付单表。
- 支付状态机。
- 人工标记支付成功。
- 人工发货和物流单号记录。
- 退款申请和人工审核状态。
- 微信支付 placeholder provider。
- 支付成功后自动发放权益。
- 后台商品、库存、订单、支付、发货、退款、发放记录页面。

本阶段不做：

- 真实微信支付签名。
- 真实微信支付回调。
- 优惠券。
- 真实快递接口。
- 自动物流轨迹查询。
- 复杂地区运费模板。
- 真实退款接口。

## 文件结构

- 新建：`server/db/migrations/005_phase5_commerce_payment.sql`
- 新建：`server/commerce/product-mapping-service.mjs`
- 新建：`server/commerce/order-service.mjs`
- 新建：`server/commerce/payment-state-machine.mjs`
- 新建：`server/commerce/payment-providers/manual-provider.mjs`
- 新建：`server/commerce/payment-providers/wechat-placeholder-provider.mjs`
- 新建：`server/commerce/delivery-service.mjs`
- 新建：`server/commerce/inventory-service.mjs`
- 新建：`server/commerce/refund-service.mjs`
- 新建：`server/routes/commerce-routes.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/commerce.test.mjs`
- 新建：`src/admin/pages/ProductsPage.tsx`
- 新建：`src/admin/pages/OrdersPage.tsx`
- 新建：`src/admin/pages/PaymentsPage.tsx`
- 新建：`src/admin/pages/ShipmentsPage.tsx`
- 新建：`src/admin/pages/RefundsPage.tsx`
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
app.commerce_inventory
app.customer_addresses
app.commerce_orders
app.payment_intents
app.entitlement_deliveries
app.shipments
app.refund_requests
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
- `requires_shipping`
- `status`

商品类型：

```text
report_quota
monthly_membership
yearly_membership
digital_content
physical_goods
```

- [ ] **步骤 3：库存和收货地址表**

`commerce_inventory` 保存：

- `sku`。
- 当前库存。
- 安全库存。
- 更新时间。

默认规则：

- 按 SKU 管库存。
- 未支付订单不锁库存。
- 人工标记支付成功后扣减库存。
- 库存不足时不能标记实物订单支付成功。

`customer_addresses` 保存：

- 客户。
- 收货人。
- 手机号。
- 省。
- 市。
- 区县。
- 详细地址。
- 是否默认地址。

- [ ] **步骤 4：订单和支付表**

`commerce_orders` 保存：

- 客户。
- 订单号。
- 状态。
- 金额。
- 运费。
- 收货地址快照。
- 商品明细。

运费规则第一版：

- 固定运费。
- 满额包邮。
- 不做复杂地区运费模板。

订单状态第一版：

```text
pending_payment
paid
pending_fulfillment
shipped
completed
refund_requested
refunded
closed
```

`payment_intents` 保存：

- 订单。
- 支付提供方。
- 支付状态。
- 金额。
- provider payload。
- 支付时间。

- [ ] **步骤 5：发货、退款和权益发放表**

`entitlement_deliveries` 保存每个订单商品发放记录，避免重复发放。

`shipments` 保存：

- 订单。
- 快递公司。
- 快递单号。
- 发货备注。
- 发货时间。

`refund_requests` 保存：

- 订单。
- 商品。
- 退款原因。
- 退款金额。
- 状态：`requested`、`approved`、`rejected`、`processed`。
- 人工审核人和处理备注。

- [ ] **步骤 6：测试并提交**

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
physical_goods     -> requiresShipping true + inventorySku
```

实物商品不发放虚拟权益，但必须进入库存扣减和人工发货流程。

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
- 新建：`server/commerce/inventory-service.mjs`
- 新建：`server/commerce/refund-service.mjs`

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
- 实物商品：不发放虚拟权益，进入人工发货流程。
- 消费积分：按金额发放积分。

- [ ] **步骤 4：库存服务**

`inventory-service.mjs` 提供：

```js
checkInventory(client, { sku, quantity })
deductInventory(client, { sku, quantity, referenceType, referenceId })
```

规则：

- 只在人工标记支付成功时扣减库存。
- 未支付订单不锁库存。
- 库存不足时阻止订单标记为已支付。
- 取消未支付订单不需要释放库存。

- [ ] **步骤 5：退款服务**

`refund-service.mjs` 提供：

```js
createRefundRequest(client, { orderId, customerId, reason, amountCents })
reviewRefundRequest(client, { refundRequestId, status, reviewerId, note })
```

规则：

- 虚拟商品和实物商品都可以申请退款。
- 虚拟商品未使用可全额退款。
- 已消耗报告次数、已生效会员、已查看或下载的数字内容进入人工审核。
- 实物商品未发货可退款。
- 实物商品已发货后进入人工售后处理。
- 第一版不调用真实支付退款接口，只记录人工处理结果。

- [ ] **步骤 6：订单服务**

`order-service.mjs` 提供：

```js
createOrder(client, { customerId, items })
createPaymentIntent(client, { orderId, provider })
markPaymentPaid(client, { paymentIntentId, actorUserId })
markOrderShipped(client, { orderId, carrier, trackingNo, actorUserId })
```

`markPaymentPaid` 必须在一个事务内：

1. 校验支付单状态。
2. 更新支付单为 `paid`。
3. 更新订单为 `paid`。
3.1 如果包含实物商品，检查并扣减库存。
4. 虚拟商品发放权益，实物商品进入 `pending_fulfillment`。
5. 写审计日志。

- [ ] **步骤 7：测试并提交**

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
GET  /destiny-api/customer/addresses
POST /destiny-api/customer/addresses
PATCH /destiny-api/customer/addresses/:id
POST /destiny-api/customer/orders
GET  /destiny-api/customer/orders
GET  /destiny-api/customer/orders/:id
POST /destiny-api/customer/orders/:id/refund-requests
```

要求：

- 展示启用的虚拟商品和实物商品。
- 客户只能查看自己的订单。
- 客户只能管理自己的收货地址。

- [ ] **步骤 2：后台接口**

```text
GET   /destiny-api/admin/products
POST  /destiny-api/admin/products
PATCH /destiny-api/admin/products/:id
GET   /destiny-api/admin/orders
GET   /destiny-api/admin/payments
POST  /destiny-api/admin/payments/:id/mark-paid
POST  /destiny-api/admin/orders/:id/ship
GET   /destiny-api/admin/refund-requests
POST  /destiny-api/admin/refund-requests/:id/review
GET   /destiny-api/admin/delivery-logs
```

要求：

- 标记支付成功必须是管理员。
- 已支付或已取消的支付单不能再次标记。
- 发货由后台人工填写快递公司和快递单号。
- 退款由后台人工审核和记录处理结果。

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
- 新建：`src/admin/pages/ShipmentsPage.tsx`
- 新建：`src/admin/pages/RefundsPage.tsx`
- 新建：`src/admin/pages/DeliveryLogsPage.tsx`
- 修改：`src/admin/AdminApp.tsx`
- 修改：`src/admin/components/AdminLayout.tsx`
- 新建测试：`tests/test_phase5_commerce_scaffold.py`

- [ ] **步骤 1：新增菜单**

后台菜单加入：

```text
商品管理
库存管理
订单管理
支付管理
发货管理
退款管理
发放记录
```

- [ ] **步骤 2：商品管理页**

展示：

- SKU。
- 商品名称。
- 商品类型。
- 价格。
- 权益 payload。
- 是否需要发货。
- 库存 SKU。
- 启用状态。

- [ ] **步骤 3：库存、订单和支付页**

订单页展示客户、金额、状态、商品明细。支付页展示支付单状态，并提供人工标记支付成功入口。

库存页展示 SKU、当前库存、安全库存和最近更新时间。

- [ ] **步骤 4：发货和退款页**

发货页展示待发货订单，并支持填写快递公司和快递单号。

退款页展示退款申请、订单类型、退款原因、退款金额，并支持人工审核通过或拒绝。

- [ ] **步骤 5：发放记录页**

展示每个订单商品对应的权益发放结果。

- [ ] **步骤 6：检查并提交**

```powershell
python -m unittest tests.test_phase5_commerce_scaffold
npm run lint
npm run build
git add src/admin tests/test_phase5_commerce_scaffold.py
git commit -m "feat: add commerce admin pages"
```

## 验收标准

- 后台可以配置虚拟商品和权益 payload。
- 后台可以配置实物商品、SKU 库存和是否需要发货。
- 客户可以创建虚拟商品和实物商品订单。
- 客户可以维护收货地址。
- 人工标记支付成功后，订单和支付单都变成已支付。
- 已支付虚拟订单会自动发放权益，且不会重复发放。
- 已支付实物订单会扣减库存并进入待发货。
- 后台可以人工填写快递公司和快递单号。
- 虚拟和实物订单都可以提交退款申请，并由后台人工审核。
- 微信支付只作为占位 provider 出现，不引入真实密钥。
- 第一版不接真实快递接口、真实物流轨迹和真实退款接口。
