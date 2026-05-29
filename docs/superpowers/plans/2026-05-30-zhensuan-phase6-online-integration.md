# Zhensuan Phase 6 Online Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect mini program, H5, admin publishing, report generation, entitlement deduction, commerce, and server operations into one verified online release path.

**Architecture:** H5 and mini program call the same customer APIs. Admin manages publishable knowledge/rules/templates and commercial operations. Server deployment uses environment files, migrations, health checks, logs, and backup scripts so the online system can be operated on the existing server without exposing internal services.

**Tech Stack:** Node.js ESM, Express, PostgreSQL, Neo4j, MedusaJS, Vite, React, TypeScript, WeChat Mini Program, Nginx, systemd, native `node:test`, Python unittest.

---

## Scope

This phase implements:

- H5 customer login and value-state integration.
- Mini program customer login and report flow integration.
- Admin publish workflow smoke tests.
- End-to-end report flow with entitlement deduction.
- Server environment files and deployment checklist.
- Runtime health endpoints and log views.
- Backup and restore verification notes.

This phase does not add new product modules beyond the MVP modules already planned.

## File Structure

- Create: `server/routes/ops-routes.mjs`
- Create: `server/ops/health-service.mjs`
- Create: `server/ops/log-service.mjs`
- Modify: `server/app.mjs`
- Modify: `src/lib/insights.ts`
- Create: `src/lib/customerAuth.ts`
- Create: `src/components/LoginPanel.tsx`
- Create: `src/components/ValueState.tsx`
- Modify: `src/App.tsx`
- Modify: `miniprogram/utils/api.js`
- Create: `miniprogram/utils/auth.js`
- Modify: `miniprogram/pages/home/index.js`
- Modify: `miniprogram/pages/report/index.js`
- Create: `docs/deployment/zhensuan-online-runbook.md`
- Create: `tests/test_phase6_online_integration_scaffold.py`
- Create: `server/tests/ops.test.mjs`

---

### Task 1: Add Runtime Health And Ops APIs

**Files:**
- Create: `server/ops/health-service.mjs`
- Create: `server/ops/log-service.mjs`
- Create: `server/routes/ops-routes.mjs`
- Modify: `server/app.mjs`
- Test: `server/tests/ops.test.mjs`

- [ ] **Step 1: Add ops tests**

Create `server/tests/ops.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeHealth } from '../ops/health-service.mjs';

test('health summary reports dependency states', () => {
  const result = summarizeHealth({
    api: true,
    postgres: true,
    neo4j: false,
    medusa: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.dependencies.postgres, 'ok');
  assert.equal(result.dependencies.neo4j, 'down');
});
```

- [ ] **Step 2: Implement health service**

Create `server/ops/health-service.mjs`:

```js
export function summarizeHealth(state) {
  const dependencies = {
    api: state.api ? 'ok' : 'down',
    postgres: state.postgres ? 'ok' : 'down',
    neo4j: state.neo4j ? 'ok' : 'down',
    medusa: state.medusa ? 'ok' : 'down',
  };
  return {
    ok: Object.values(dependencies).every((value) => value === 'ok'),
    dependencies,
  };
}
```

- [ ] **Step 3: Implement ops routes**

Create admin-protected endpoints:

```text
GET /destiny-api/admin/ops/health
GET /destiny-api/admin/ops/recent-errors
```

Public health remains:

```text
GET /destiny-api/health
```

The admin health endpoint checks PostgreSQL with `select 1`, Neo4j with a lightweight read query, and Medusa with its configured health URL when available.

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:server
git add server/ops server/routes/ops-routes.mjs server/app.mjs server/tests/ops.test.mjs
git commit -m "feat: add ops health api"
```

Expected: PASS before commit.

---

### Task 2: Add H5 Customer Login And Value State

**Files:**
- Create: `src/lib/customerAuth.ts`
- Create: `src/components/LoginPanel.tsx`
- Create: `src/components/ValueState.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/insights.ts`

- [ ] **Step 1: Implement customer auth client**

Create `src/lib/customerAuth.ts`:

```ts
const TOKEN_KEY = 'zhensuan_customer_token';

export function getCustomerToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setCustomerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export async function sendOtp(phone: string) {
  const response = await fetch('/destiny-api/customer/otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return response.json();
}

export async function verifyOtp(phone: string, code: string) {
  const response = await fetch('/destiny-api/customer/otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || body.error || '登录失败');
  setCustomerToken(body.token);
  return body.customer;
}
```

- [ ] **Step 2: Add login panel**

Create `src/components/LoginPanel.tsx` with phone input, send code button, code input, and verify button. The component should not mention provider internals; it only shows 手机号 and 验证码.

- [ ] **Step 3: Add value state component**

Create `src/components/ValueState.tsx` showing:

```text
会员状态
报告次数
积分余额
成长等级
```

- [ ] **Step 4: Attach customer token to report generation**

Modify `src/lib/insights.ts` so `generateInsight` sends:

```ts
Authorization: `Bearer ${getCustomerToken()}`
```

when a customer token exists.

- [ ] **Step 5: Run checks and commit**

```powershell
npm run lint
npm run build
git add src/lib/customerAuth.ts src/components/LoginPanel.tsx src/components/ValueState.tsx src/App.tsx src/lib/insights.ts
git commit -m "feat: integrate h5 customer auth"
```

Expected: both checks PASS before commit.

---

### Task 3: Add Mini Program Customer Integration

**Files:**
- Modify: `miniprogram/utils/api.js`
- Create: `miniprogram/utils/auth.js`
- Modify: `miniprogram/pages/home/index.js`
- Modify: `miniprogram/pages/report/index.js`
- Test: `tests/test_phase6_online_integration_scaffold.py`

- [ ] **Step 1: Add scaffold test**

Create `tests/test_phase6_online_integration_scaffold.py`:

```python
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
MINI = ROOT / "miniprogram"

class Phase6OnlineIntegrationScaffoldTests(unittest.TestCase):
    def test_miniprogram_auth_file_exists(self):
        self.assertTrue((MINI / "utils" / "auth.js").exists())

    def test_miniprogram_uses_customer_token(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8")
            for path in [MINI / "utils" / "api.js", MINI / "utils" / "auth.js"]
        )
        self.assertIn("Authorization", combined)
        self.assertIn("customer_token", combined)
```

- [ ] **Step 2: Create mini program auth utility**

Create `miniprogram/utils/auth.js`:

```js
const TOKEN_KEY = 'customer_token';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function loginWithWechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: ({ code }) => {
        wx.request({
          url: 'https://www.goye.cc/destiny-api/customer/login/wechat',
          method: 'POST',
          data: { code },
          success: (response) => {
            const token = response.data && response.data.token;
            if (token) setToken(token);
            resolve(response.data);
          },
          fail: reject,
        });
      },
      fail: reject,
    });
  });
}

module.exports = { getToken, setToken, loginWithWechatCode };
```

- [ ] **Step 3: Attach token in API requests**

Modify `miniprogram/utils/api.js` to add:

```js
const auth = require('./auth');

header: {
  'content-type': 'application/json',
  Authorization: auth.getToken() ? `Bearer ${auth.getToken()}` : '',
}
```

- [ ] **Step 4: Trigger login on home**

Modify `miniprogram/pages/home/index.js` so the page calls `loginWithWechatCode` when no customer token exists.

- [ ] **Step 5: Run tests and commit**

```powershell
python -m unittest tests.test_phase6_online_integration_scaffold tests.test_miniprogram_scaffold
git add miniprogram tests/test_phase6_online_integration_scaffold.py
git commit -m "feat: integrate miniprogram customer auth"
```

Expected: both tests PASS before commit.

---

### Task 4: Verify End-To-End Report And Entitlement Flow

**Files:**
- Modify: `server/tests/app-routes.test.mjs`
- Create: `docs/deployment/zhensuan-online-runbook.md`

- [ ] **Step 1: Create runbook and define manual E2E scenario**

Document this scenario in the runbook:

```text
1. Create or identify a customer.
2. Grant the customer 1 report quota.
3. Generate one report from H5 or mini program.
4. Confirm report is saved in report_runs.
5. Confirm report_quota_balance decreases by 1.
6. Confirm insufficient quota returns 402 on the next paid report request.
```

- [ ] **Step 2: Add API smoke test with mocked services**

Add a Node test that uses mocked pool/model service and asserts:

```text
generation response contains report
spendReportQuota is called after successful report generation
safety review result is saved
```

- [ ] **Step 3: Run checks and commit**

```powershell
npm run test:server
git add server/tests/app-routes.test.mjs docs/deployment/zhensuan-online-runbook.md
git commit -m "test: document report entitlement e2e"
```

Expected: PASS before commit.

---

### Task 5: Extend Server Deployment Runbook

**Files:**
- Modify: `docs/deployment/zhensuan-online-runbook.md`

- [ ] **Step 1: Extend runbook**

Update `docs/deployment/zhensuan-online-runbook.md` with sections:

```text
# 甄算线上运行手册

## 服务组成
Node/Express API
Vite 静态前端
PostgreSQL
Neo4j
MedusaJS
Nginx
systemd

## 环境变量
DATABASE_URL
SESSION_SECRET
DEEPSEEK_API_KEY
NEO4J_URI
NEO4J_USERNAME
NEO4J_PASSWORD
CUSTOMER_AUTH_MOCKS_ENABLED

## 部署顺序
拉取代码
npm install
npm run db:migrate
npm run build
重启 Node 服务
检查 Nginx
检查 HTTPS

## 健康检查
curl https://www.goye.cc/destiny-api/health
curl http://127.0.0.1:3201/destiny-api/health

## 回滚策略
保留上一版构建产物
代码回滚走 git
数据库只做前向修复迁移

## 备份
PostgreSQL 每日备份
Neo4j 定期 dump
上传目录和环境文件独立备份
```

- [ ] **Step 2: Add server verification commands**

Include commands:

```bash
systemctl status zhensuan-api
journalctl -u zhensuan-api -n 100 --no-pager
nginx -t
curl -I https://www.goye.cc
```

- [ ] **Step 3: Commit**

```powershell
git add docs/deployment/zhensuan-online-runbook.md
git commit -m "docs: extend online runbook"
```

---

### Task 6: Final Release Verification

**Files:**
- Modify: `docs/deployment/zhensuan-online-runbook.md`

- [ ] **Step 1: Run local verification**

```powershell
npm run test:server
python -m unittest tests.test_branding tests.test_miniprogram_scaffold tests.test_phase6_online_integration_scaffold
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Run server verification**

On the server:

```bash
npm run db:migrate
npm run build
systemctl restart zhensuan-api
curl https://www.goye.cc/destiny-api/health
```

Expected: health response contains `"ok":true`.

- [ ] **Step 3: Browser and mini program checks**

Verify:

```text
https://www.goye.cc opens H5
https://www.goye.cc/admin opens backend login
mini program can request https://www.goye.cc/destiny-api/health
customer report generation returns a report
```

- [ ] **Step 4: Commit final runbook updates**

```powershell
git add docs/deployment/zhensuan-online-runbook.md
git commit -m "docs: record online verification"
```

Commit only if the runbook was updated with concrete verification results.

---

## Acceptance Criteria

- H5 and mini program use the same customer token model.
- Customer report generation consumes entitlement quota.
- Admin can view runtime health and recent errors.
- Deployment runbook includes environment, migration, restart, health, rollback, and backup procedures.
- Server health check passes over HTTPS.
- The online MVP can be operated without direct database edits for normal customer/report/order workflows.
