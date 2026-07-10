# 甄好算 阶段 1：基础账号与后台骨架实施计划

> **给执行代理看的要求：** 按任务逐项执行。执行时优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。每个任务完成后都要测试、提交，再进入下一项。

**目标：** 建好甄好算后台的第一层地基：数据库迁移、后端模块拆分、后台账号登录、客户多方式登录模拟接口，以及 `/admin` 后台壳子。

**架构：** 保留当前 Vite/React H5 和 Node/Express API，但把后端从单文件拆成可维护模块。PostgreSQL 作为账号、会话和审计日志的主库；微信和扫码登录第一阶段先做可替换的模拟实现；短信服务商确认使用腾讯云短信，但第一阶段只做模板设计和模拟发送。

**技术栈：** Node.js ESM、Express、PostgreSQL、Vite、React、TypeScript、`node:test`、Python unittest。

---

## 范围

本阶段要完成：

- 后端 Express 应用拆分。
- PostgreSQL 迁移机制。
- 用户、后台账号、客户身份、登录会话、短信验证码、扫码登录会话、审计日志基础表。
- 后端编辑人员和平台管理员账号密码登录。
- 客户微信登录、手机号验证码登录、扫码登录的模拟接口。
- `/admin` 后台登录页、总览页、用户管理占位页。
- 本地测试、构建和服务器部署前检查。

本阶段不做：

- 真实微信开放接口。
- 真实腾讯云短信接口调用。
- 真实微信支付。
- Neo4j 图谱编辑。
- MedusaJS 商城接入。
- 规则引擎和报告模板。

## 文件结构

- 修改：`package.json`，新增数据库、测试和初始化脚本。
- 修改：`.env.example`，新增数据库、会话和登录模拟配置。
- 修改：`server/index.mjs`，变成极薄的进程入口。
- 新建：`server/app.mjs`，创建 Express app 并挂载路由。
- 新建：`server/config.mjs`，统一读取环境变量。
- 新建：`server/db/pool.mjs`，创建 PostgreSQL 连接池。
- 新建：`server/db/migrate.mjs`，执行数据库迁移。
- 新建：`server/db/migrations/001_phase1_auth.sql`，账号与登录基础表。
- 新建：`server/auth/passwords.mjs`，密码哈希和校验。
- 新建：`server/auth/sessions.mjs`，会话 token 创建、哈希和写入。
- 新建：`server/middleware/require-session.mjs`，接口鉴权中间件。
- 新建：`server/routes/report-routes.mjs`，迁移现有报告接口。
- 新建：`server/routes/admin-auth-routes.mjs`，后台登录接口。
- 新建：`server/routes/customer-auth-routes.mjs`，客户多方式登录模拟接口。
- 新建：`server/scripts/create-admin.mjs`，创建第一个平台管理员。
- 新建：`server/tests/*.test.mjs`，后端基础测试。
- 修改：`src/main.tsx`，根据 `/admin` 路径渲染后台。
- 新建：`src/admin/**`，后台壳子和页面。
- 新建：`tests/test_phase1_admin_scaffold.py`，后台脚手架静态检查。

---

## 任务 1：补依赖、脚本和环境变量

**文件：**
- 修改：`package.json`
- 修改：`.env.example`

- [ ] **步骤 1：新增脚本**

在 `package.json` 中保留原脚本，并补充：

```json
{
  "db:migrate": "node server/db/migrate.mjs",
  "admin:create": "node server/scripts/create-admin.mjs",
  "test:server": "node --test server/tests/*.test.mjs",
  "test:py": "python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase1_admin_scaffold"
}
```

- [ ] **步骤 2：新增依赖**

新增：

```json
{
  "dependencies": {
    "pg": "^8.13.1"
  }
}
```

- [ ] **步骤 3：新增环境变量**

在 `.env.example` 追加：

```env
DATABASE_URL="postgres://zhensuan_app:CHANGE_ME@127.0.0.1:5432/zhensuan"
SESSION_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_STRING"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="CHANGE_ME_BEFORE_USE"
CUSTOMER_AUTH_MOCKS_ENABLED="true"
SMS_CODE_TTL_SECONDS="300"
QR_LOGIN_TTL_SECONDS="180"
```

- [ ] **步骤 4：安装并检查**

运行：

```powershell
npm install
npm run lint
```

预期：依赖安装成功；如果后续文件尚未创建导致 lint 报缺文件，继续执行后续任务，并在最终统一复跑。

- [ ] **步骤 5：提交**

```powershell
git add package.json package-lock.json .env.example
git commit -m "chore: add phase one dependencies"
```

---

## 任务 2：拆分 Express 应用

**文件：**
- 修改：`server/index.mjs`
- 新建：`server/app.mjs`
- 新建：`server/config.mjs`
- 新建：`server/routes/report-routes.mjs`
- 新建测试：`server/tests/app-routes.test.mjs`

- [ ] **步骤 1：先写健康检查测试**

测试目标：`GET /destiny-api/health` 返回：

```json
{
  "ok": true,
  "model": "deepseek-chat",
  "hasKey": false
}
```

- [ ] **步骤 2：创建 `server/config.mjs`**

配置项必须包含：

```js
port
apiKey
model
endpoint
databaseUrl
sessionSecret
customerAuthMocksEnabled
smsCodeTtlSeconds
qrLoginTtlSeconds
```

- [ ] **步骤 3：创建 `server/routes/report-routes.mjs`**

把当前 `server/index.mjs` 里的：

- `fallbackReport`
- `buildPrompt`
- `/destiny-api/health`
- `/destiny-api/generate`

迁移到 `mountReportRoutes(app, { config })` 中。保持现有报告 JSON 结构和免责声明不变。

- [ ] **步骤 4：创建 `server/app.mjs`**

负责：

- `express.json({ limit: '1mb' })`
- 挂载报告路由。
- 后续有数据库时挂载登录和后台路由。

- [ ] **步骤 5：精简 `server/index.mjs`**

只保留：

```js
import 'dotenv/config';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, '127.0.0.1', () => {
  console.log(`destiny api listening on http://127.0.0.1:${config.port}`);
});
```

- [ ] **步骤 6：测试并提交**

```powershell
npm run test:server
git add server/index.mjs server/app.mjs server/config.mjs server/routes/report-routes.mjs server/tests/app-routes.test.mjs
git commit -m "refactor: split express app"
```

预期：后端测试通过。

---

## 任务 3：建立 PostgreSQL 迁移和账号表

**文件：**
- 新建：`server/db/pool.mjs`
- 新建：`server/db/migrate.mjs`
- 新建：`server/db/migrations/001_phase1_auth.sql`
- 修改测试：`server/tests/app-routes.test.mjs`

- [ ] **步骤 1：创建连接池**

`server/db/pool.mjs` 必须从 `DATABASE_URL` 创建 `pg.Pool`，并限制连接数：

```js
max: 5
idleTimeoutMillis: 30000
```

- [ ] **步骤 2：创建迁移表**

`001_phase1_auth.sql` 必须包含：

- `app.users`
- `app.admin_accounts`
- `app.customer_identities`
- `app.login_sessions`
- `app.sms_otp_challenges`
- `app.qr_login_sessions`
- `app.audit_logs`

关键状态字段：

```sql
account_type in ('customer', 'editor', 'admin')
status in ('active', 'disabled')
qr status in ('pending', 'confirmed', 'expired', 'cancelled')
```

- [ ] **步骤 3：创建迁移执行器**

`server/db/migrate.mjs` 要做到：

- 按文件名排序执行 `server/db/migrations/*.sql`。
- 每个迁移执行成功后写入 `app.schema_migrations`。
- 已执行迁移不重复执行。
- 任意失败时回滚当前迁移。

- [ ] **步骤 4：测试迁移文件结构**

在 `server/tests/app-routes.test.mjs` 中检查 SQL 中存在上述表名。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/db server/tests/app-routes.test.mjs
git commit -m "feat: add phase one auth schema"
```

---

## 任务 4：实现密码和会话基础能力

**文件：**
- 新建：`server/auth/passwords.mjs`
- 新建：`server/auth/sessions.mjs`
- 新建：`server/middleware/require-session.mjs`
- 新建测试：`server/tests/passwords.test.mjs`

- [ ] **步骤 1：密码测试**

测试要求：

- `hashPassword('原密码')` 返回 `scrypt:` 开头的哈希。
- 原密码验证通过。
- 错误密码验证失败。

- [ ] **步骤 2：实现密码哈希**

使用 Node 内置 `crypto.scrypt`，不要明文保存密码。

- [ ] **步骤 3：实现会话 token**

要求：

- token 使用 `crypto.randomBytes(32).toString('base64url')`。
- 入库前用 `SESSION_SECRET` 做 HMAC SHA-256。
- `login_sessions` 只保存 token hash，不保存原 token。

- [ ] **步骤 4：实现鉴权中间件**

`requireSession({ pool, config, accountTypes })` 要检查：

- `Authorization: Bearer <token>`
- token 未过期。
- token 未撤销。
- 用户状态为 `active`。
- 账号类型在允许范围内。

- [ ] **步骤 5：测试并提交**

```powershell
npm run test:server
git add server/auth server/middleware server/tests/passwords.test.mjs
git commit -m "feat: add auth primitives"
```

---

## 任务 5：后台账号登录

**文件：**
- 新建：`server/routes/admin-auth-routes.mjs`
- 新建：`server/scripts/create-admin.mjs`
- 修改：`server/app.mjs`
- 修改测试：`server/tests/app-routes.test.mjs`

- [ ] **步骤 1：接口**

实现：

```text
POST /destiny-api/admin/login
GET  /destiny-api/admin/me
```

登录成功返回：

```json
{
  "token": "session-token",
  "user": {
    "id": "uuid",
    "username": "admin",
    "displayName": "admin",
    "role": "admin"
  }
}
```

- [ ] **步骤 2：创建管理员脚本**

`npm run admin:create` 根据环境变量创建或更新第一个平台管理员：

```env
ADMIN_INITIAL_USERNAME
ADMIN_INITIAL_PASSWORD
```

密码长度不足 12 位时直接退出。

- [ ] **步骤 3：挂载路由**

`server/app.mjs` 在存在数据库连接池时挂载后台登录路由。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/app.mjs server/routes/admin-auth-routes.mjs server/scripts/create-admin.mjs server/tests/app-routes.test.mjs
git commit -m "feat: add admin login api"
```

---

## 任务 6：客户三种登录模拟接口

**文件：**
- 新建：`server/routes/customer-auth-routes.mjs`
- 修改：`server/app.mjs`
- 新建测试：`server/tests/customer-auth.test.mjs`

- [ ] **步骤 1：微信登录模拟**

接口：

```text
POST /destiny-api/customer/login/wechat
```

请求：

```json
{ "code": "mock-code" }
```

逻辑：

- 用 `mock-wechat-${code}` 作为模拟身份。
- 查找或创建客户账号。
- 写入客户身份绑定。
- 返回客户 session token。

- [ ] **步骤 2：手机号验证码模拟**

接口：

```text
POST /destiny-api/customer/otp/send
POST /destiny-api/customer/otp/verify
```

第一版验证码固定返回开发码 `246810`，但仍要保存哈希、有效期、尝试次数和消耗状态。

短信模板先按腾讯云短信设计，但不接真实接口：

```text
短信签名：甄好算
登录验证码模板：您的登录验证码为 {code}，5 分钟内有效。如非本人操作，请忽略。
绑定手机号模板：您的绑定手机号验证码为 {code}，5 分钟内有效。如非本人操作，请忽略。
```

代码结构需要预留：

- 腾讯云短信 `SmsSdkAppId`。
- 短信签名。
- 登录验证码模板 ID。
- 绑定手机号模板 ID。
- 短信发送日志。
- 模拟发送 provider 和腾讯云 provider 的替换边界。

- [ ] **步骤 3：扫码登录模拟**

接口：

```text
POST /destiny-api/customer/qr/create
GET  /destiny-api/customer/qr/status/:token
POST /destiny-api/customer/qr/confirm
```

状态：

```text
pending
confirmed
expired
cancelled
```

二维码 token 必须短时有效、一次性使用。

- [ ] **步骤 4：测试并提交**

```powershell
npm run test:server
git add server/app.mjs server/routes/customer-auth-routes.mjs server/tests/customer-auth.test.mjs
git commit -m "feat: add customer login mocks"
```

---

## 任务 7：后台前端壳子

**文件：**
- 修改：`src/main.tsx`
- 新建：`src/admin/AdminApp.tsx`
- 新建：`src/admin/api.ts`
- 新建：`src/admin/components/AdminLayout.tsx`
- 新建：`src/admin/pages/LoginPage.tsx`
- 新建：`src/admin/pages/DashboardPage.tsx`
- 新建：`src/admin/pages/UsersPage.tsx`
- 新建测试：`tests/test_phase1_admin_scaffold.py`

- [ ] **步骤 1：路由入口**

`src/main.tsx` 根据路径选择：

```ts
window.location.pathname.startsWith('/admin') ? AdminApp : App
```

- [ ] **步骤 2：后台登录页**

页面包含：

- 账号输入框。
- 密码输入框。
- 登录按钮。
- 登录失败提示。
- 成功后保存 `zhensuan_admin_token`。

- [ ] **步骤 3：后台布局**

第一版菜单：

```text
总览
用户管理
会员与积分
订单与支付
系统设置
```

- [ ] **步骤 4：总览和用户页**

总览展示占位指标：

- 客户账号。
- 后台账号。
- 今日登录。
- 待处理事项。

用户页展示账号体系占位表格。

- [ ] **步骤 5：测试、构建并提交**

```powershell
python -m unittest tests.test_phase1_admin_scaffold
npm run lint
npm run build
git add src/main.tsx src/admin tests/test_phase1_admin_scaffold.py
git commit -m "feat: add admin shell"
```

---

## 任务 8：最终验证和服务器准备

- [ ] **步骤 1：本地全量检查**

```powershell
npm run test:server
python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase1_admin_scaffold
npm run lint
npm run build
```

- [ ] **步骤 2：执行数据库迁移**

```powershell
npm run db:migrate
```

预期：首次执行显示已应用 `001_phase1_auth`；重复执行不报错。

- [ ] **步骤 3：创建第一个平台管理员**

```powershell
npm run admin:create
```

预期：

```text
admin account ready: <username>
```

- [ ] **步骤 4：启动并检查**

```powershell
npm start
Invoke-RestMethod http://127.0.0.1:3201/destiny-api/health
```

预期：返回 `ok: true`。

- [ ] **步骤 5：浏览器检查**

打开：

```text
http://127.0.0.1:3000/admin
```

预期：显示“甄好算后台登录”。

## 验收标准

- 后端从单文件拆成模块化结构。
- PostgreSQL 有 阶段 1 账号和登录表。
- 后台管理员可以登录。
- 客户微信、手机验证码、扫码登录都有模拟接口。
- `/admin` 后台壳子可打开。
- 所有本阶段测试、lint、build 通过。
