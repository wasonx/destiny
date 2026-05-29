# 甄算 阶段 6：线上联调与发布闭环实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 把 H5、小程序、后台发布、报告生成、权益扣减、商城订单、服务器运行和日志备份串成一条可验证的线上闭环。

**架构：** H5 和微信小程序共用同一套客户 API；后台负责知识、规则、模板和商业配置；服务器通过环境文件、迁移脚本、健康检查、日志和备份保证可运维。Neo4j、PostgreSQL、MedusaJS 均不直接暴露公网。

**技术栈：** Node.js ESM、Express、PostgreSQL、Neo4j、MedusaJS、Vite、React、TypeScript、微信小程序、Nginx、systemd、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- H5 客户登录和权益状态接入。
- 小程序客户登录和报告生成接入。
- 后台发布流程联调。
- 报告生成和权益扣减端到端验证。
- 线上运行手册。
- 健康检查和最近错误查看。
- 服务器部署、回滚和备份检查。

本阶段不新增新的业务模块，只做前面阶段的联调、补口和上线闭环。

## 文件结构

- 新建：`server/routes/ops-routes.mjs`
- 新建：`server/ops/health-service.mjs`
- 新建：`server/ops/log-service.mjs`
- 修改：`server/app.mjs`
- 修改：`src/lib/insights.ts`
- 新建：`src/lib/customerAuth.ts`
- 新建：`src/components/LoginPanel.tsx`
- 新建：`src/components/ValueState.tsx`
- 修改：`src/App.tsx`
- 修改：`miniprogram/utils/api.js`
- 新建：`miniprogram/utils/auth.js`
- 修改：`miniprogram/pages/home/index.js`
- 修改：`miniprogram/pages/report/index.js`
- 新建：`docs/deployment/zhensuan-online-runbook.md`
- 新建测试：`tests/test_phase6_online_integration_scaffold.py`
- 新建测试：`server/tests/ops.test.mjs`

---

## 任务 1：运行健康检查和运维接口

**文件：**
- 新建：`server/ops/health-service.mjs`
- 新建：`server/ops/log-service.mjs`
- 新建：`server/routes/ops-routes.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/ops.test.mjs`

- [ ] **步骤 1：健康状态结构**

`summarizeHealth` 输入：

```js
{
  api: true,
  postgres: true,
  neo4j: false,
  medusa: false
}
```

输出：

```json
{
  "ok": false,
  "dependencies": {
    "api": "ok",
    "postgres": "ok",
    "neo4j": "down",
    "medusa": "down"
  }
}
```

- [ ] **步骤 2：运维接口**

后台鉴权接口：

```text
GET /destiny-api/admin/ops/health
GET /destiny-api/admin/ops/recent-errors
```

公开接口保留：

```text
GET /destiny-api/health
```

- [ ] **步骤 3：依赖检查**

后台健康检查要检查：

- PostgreSQL：`select 1`
- Neo4j：轻量只读查询。
- MedusaJS：如果配置了 health URL，检查 HTTP 状态。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/ops server/routes/ops-routes.mjs server/app.mjs server/tests/ops.test.mjs
git commit -m "feat: add ops health api"
```

---

## 任务 2：H5 客户登录和权益状态

**文件：**
- 新建：`src/lib/customerAuth.ts`
- 新建：`src/components/LoginPanel.tsx`
- 新建：`src/components/ValueState.tsx`
- 修改：`src/App.tsx`
- 修改：`src/lib/insights.ts`

- [ ] **步骤 1：客户登录客户端**

`customerAuth.ts` 提供：

```ts
getCustomerToken()
setCustomerToken(token)
sendOtp(phone)
verifyOtp(phone, code)
```

token 存储 key：

```text
zhensuan_customer_token
```

- [ ] **步骤 2：登录组件**

`LoginPanel.tsx` 显示：

- 手机号输入。
- 发送验证码按钮。
- 验证码输入。
- 登录按钮。
- 错误提示。

页面文案只写“手机号”和“验证码”，不暴露实现细节。

- [ ] **步骤 3：权益状态组件**

`ValueState.tsx` 展示：

```text
会员状态
报告次数
积分余额
成长等级
```

- [ ] **步骤 4：报告生成带 token**

修改 `src/lib/insights.ts`，如果存在客户 token，请求头加入：

```ts
Authorization: `Bearer ${getCustomerToken()}`
```

- [ ] **步骤 5：检查并提交**

```powershell
npm run lint
npm run build
git add src/lib/customerAuth.ts src/components/LoginPanel.tsx src/components/ValueState.tsx src/App.tsx src/lib/insights.ts
git commit -m "feat: integrate h5 customer auth"
```

---

## 任务 3：微信小程序客户登录接入

**文件：**
- 修改：`miniprogram/utils/api.js`
- 新建：`miniprogram/utils/auth.js`
- 修改：`miniprogram/pages/home/index.js`
- 修改：`miniprogram/pages/report/index.js`
- 新建测试：`tests/test_phase6_online_integration_scaffold.py`

- [ ] **步骤 1：小程序 auth 工具**

`miniprogram/utils/auth.js` 提供：

```js
getToken()
setToken(token)
loginWithWechatCode()
```

token 存储 key：

```text
customer_token
```

- [ ] **步骤 2：微信 code 登录**

`loginWithWechatCode` 调用：

```text
POST https://www.goye.cc/destiny-api/customer/login/wechat
```

成功后保存返回的客户 token。

- [ ] **步骤 3：API 请求带 token**

修改 `miniprogram/utils/api.js`，所有报告请求加入：

```js
Authorization: auth.getToken() ? `Bearer ${auth.getToken()}` : ''
```

- [ ] **步骤 4：首页自动登录**

`miniprogram/pages/home/index.js` 在没有 token 时调用 `loginWithWechatCode()`。

- [ ] **步骤 5：测试并提交**

```powershell
python -m unittest tests.test_phase6_online_integration_scaffold tests.test_miniprogram_scaffold
git add miniprogram tests/test_phase6_online_integration_scaffold.py
git commit -m "feat: integrate miniprogram customer auth"
```

---

## 任务 4：报告和权益端到端验证

**文件：**
- 修改：`server/tests/app-routes.test.mjs`
- 新建：`docs/deployment/zhensuan-online-runbook.md`

- [ ] **步骤 1：写入手动 E2E 场景**

运行手册记录：

```text
1. 创建或找到一个客户。
2. 给客户发放 1 次报告次数。
3. 从 H5 或小程序生成 1 份报告。
4. 确认 report_runs 有记录。
5. 确认 report_quota_balance 减少 1。
6. 再次请求付费报告时，次数不足返回 402。
```

- [ ] **步骤 2：补 API 冒烟测试**

用 mock pool / mock report service 测试：

- 报告生成返回 report。
- 成功后调用扣减次数逻辑。
- 安全审查结果被保存。

- [ ] **步骤 3：测试并提交**

```powershell
npm run test:server
git add server/tests/app-routes.test.mjs docs/deployment/zhensuan-online-runbook.md
git commit -m "test: document report entitlement e2e"
```

---

## 任务 5：线上运行手册

**文件：**
- 修改：`docs/deployment/zhensuan-online-runbook.md`

- [ ] **步骤 1：补服务组成**

运行手册必须包含：

```text
Node/Express API
Vite 静态前端
PostgreSQL
Neo4j
MedusaJS
Nginx
systemd
```

- [ ] **步骤 2：补环境变量**

必须列出：

```text
DATABASE_URL
SESSION_SECRET
DEEPSEEK_API_KEY
NEO4J_URI
NEO4J_USERNAME
NEO4J_PASSWORD
CUSTOMER_AUTH_MOCKS_ENABLED
```

- [ ] **步骤 3：补部署顺序**

```text
拉取代码
npm install
npm run db:migrate
npm run build
重启 Node 服务
检查 Nginx
检查 HTTPS
```

- [ ] **步骤 4：补服务器检查命令**

```bash
systemctl status zhensuan-api
journalctl -u zhensuan-api -n 100 --no-pager
nginx -t
curl -I https://www.goye.cc
curl https://www.goye.cc/destiny-api/health
```

- [ ] **步骤 5：补回滚和备份**

说明：

- 代码回滚走 git。
- 数据库只做前向修复迁移。
- PostgreSQL 每日备份。
- Neo4j 定期 dump。
- 环境文件单独备份。

- [ ] **步骤 6：提交**

```powershell
git add docs/deployment/zhensuan-online-runbook.md
git commit -m "docs: extend online runbook"
```

---

## 任务 6：最终发布验证

- [ ] **步骤 1：本地验证**

```powershell
npm run test:server
python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase6_online_integration_scaffold
npm run lint
npm run build
```

- [ ] **步骤 2：服务器验证**

在服务器运行：

```bash
npm run db:migrate
npm run build
systemctl restart zhensuan-api
curl https://www.goye.cc/destiny-api/health
```

预期：返回 `"ok": true`。

- [ ] **步骤 3：浏览器和小程序验证**

确认：

```text
https://www.goye.cc 打开 H5
https://www.goye.cc/admin 打开后台登录
小程序能请求 https://www.goye.cc/destiny-api/health
客户能生成报告
报告生成后权益次数扣减
```

- [ ] **步骤 4：记录验证结果**

如果运行手册写入了实际验证结果，提交：

```powershell
git add docs/deployment/zhensuan-online-runbook.md
git commit -m "docs: record online verification"
```

## 验收标准

- H5 和小程序使用同一套客户 token 模型。
- 客户报告生成会扣减权益次数。
- 后台可以查看运行健康状态和最近错误。
- 运行手册包含环境、迁移、重启、健康检查、回滚和备份。
- HTTPS 健康检查通过。
- 线上 MVP 的普通客户、报告、订单和后台运维流程不需要直接改数据库。
