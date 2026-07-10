# 甄好算 1.0 Final Release Upload And Email Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the final 甄好算 1.0 delivery loop after the A+B scope is implemented: verify the deployed system, upload the native mini-program to the current WeChat mini-program account, and email the user.

**Architecture:** Treat final delivery as a release gate, not as a feature shortcut. The gate reads the frozen scope, runs local and server verification, uploads only the native `miniprogram/` project with AppID `wxc4ed7c07ce86326c`, records evidence, then sends a concise completion email.

**Tech Stack:** Node.js npm scripts, WeChat DevTools CLI, native WeChat mini-program project config, HTTPS health checks, Markdown release records, Gmail connector or user-approved mail client.

---

## Scope Source

Authoritative scope:

- `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- `docs/superpowers/specs/2026-05-30-zhensuan-1.0-full-scope-design.md`

Final delivery requires all of these to be true:

- A commercial operating loop is implemented.
- B professional knowledge base is implemented.
- Real WeChat Pay is not integrated.
- Real Tencent Cloud SMS is not integrated.
- Phone login remains simulated.
- Mini-program WeChat login is real.
- Graph computation and graph visualization are implemented.
- Native mini-program is uploaded to the current WeChat mini-program account.
- Completion email is sent after upload.

## File Structure

Read during execution:

- `package.json`: local verification scripts.
- `miniprogram/project.config.json`: AppID, compile type, mini-program root.
- `docs/miniprogram-release.md`: mini-program upload runbook.
- `docs/deployment/zhensuan-online-runbook.md`: server verification runbook.
- `docs/deployment/zhensuan-online-verification.md`: existing deployment evidence.
- `docs/superpowers/specs/2026-05-30-zhensuan-1.0-gap-audit.md`: remaining gap audit.

Modify during execution:

- `docs/deployment/zhensuan-1.0-final-release-record.md`: create or update final release evidence.
- `docs/miniprogram-release.md`: update the latest uploaded version and upload description.
- `docs/deployment/zhensuan-online-verification.md`: append final 1.0 verification evidence.

Do not modify unless explicitly needed:

- `miniprogram/project.config.json`: the current known local change is WeChat DevTools changing `libVersion` to `3.15.2`; do not stage this file as part of final release documentation unless the release itself intentionally updates mini-program config.
- Server secret files, environment files, payment certificates, Tencent SMS credentials, WeChat merchant credentials.

## Task 1: Create Final Release Record

**Files:**

- Create: `docs/deployment/zhensuan-1.0-final-release-record.md`
- Read: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- Read: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-gap-audit.md`

- [ ] **Step 1: Create the release record skeleton**

Create `docs/deployment/zhensuan-1.0-final-release-record.md`:

```markdown
# 甄好算 1.0 最终交付记录

日期：2026-05-30

## 交付范围

- A：正式商业运营版。
- B：专业知识库版。
- 真实微信支付：未接入。
- 真实腾讯云短信：未接入。
- 手机号登录：模拟验证码。
- 微信小程序登录：真实 `wx.login`。
- 图计算：已纳入验收。
- 图谱可视化：已纳入验收。
- 小程序上传：未执行，完成 Task 4 后改为“已上传”。
- 邮件通知：未执行，完成 Task 5 后改为“已发送”。

## 本地验证

| 项目 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 服务端测试 | `npm run test:server` | 未执行 | 执行 Task 2 Step 1 后替换为实际结果 |
| Python 脚手架测试 | `npm run test:py` | 未执行 | 执行 Task 2 Step 2 后替换为实际结果 |
| 小程序静态验证 | `npm run test:miniprogram` | 未执行 | 执行 Task 2 Step 3 后替换为实际结果 |
| TypeScript 检查 | `npm run lint` | 未执行 | 执行 Task 2 Step 4 后替换为实际结果 |
| 前端构建 | `npm run build` | 未执行 | 执行 Task 2 Step 5 后替换为实际结果 |

## 服务器验证

| 项目 | 命令或页面 | 结果 | 证据 |
| --- | --- | --- | --- |
| API 健康检查 | `https://www.goye.cc/destiny-api/health` | 未执行 | 执行 Task 3 Step 1 后替换为实际结果 |
| 后台页面 | `https://www.goye.cc/admin` | 未执行 | 执行 Task 3 Step 3 后替换为实际结果 |
| H5 首页 | `https://www.goye.cc` | 未执行 | 执行 Task 3 Step 2 后替换为实际结果 |
| PostgreSQL 迁移 | 服务器迁移命令 | 未执行 | 执行 Task 3 Step 4 后替换为实际结果 |
| Neo4j 图谱 | 后台图谱页面 | 未执行 | 执行 Task 3 Step 5 后替换为实际结果 |

## 小程序上传

| 项目 | 值 |
| --- | --- |
| AppID | `wxc4ed7c07ce86326c` |
| 项目目录 | `D:\Projects\destiny\miniprogram` |
| 上传版本 | 未执行，完成 Task 4 Step 5 后替换为 `1.0.0` |
| 上传备注 | 未执行，完成 Task 4 Step 5 后替换为上传备注 |
| CLI 上传结果 | 未执行，完成 Task 4 Step 5 后替换为 CLI 成功输出摘要 |

## 邮件通知

| 项目 | 值 |
| --- | --- |
| 收件人 | 未确认，完成 Task 5 Step 1 后替换为真实邮箱 |
| 邮件主题 | `甄好算 1.0 小程序已上传` |
| 发送状态 | 未执行，完成 Task 5 Step 3 后替换为“已发送” |

## 结论

待最终验证后填写。
```

- [ ] **Step 2: Run a format check for the new record**

Run:

```powershell
git diff --check -- docs/deployment/zhensuan-1.0-final-release-record.md
```

Expected: no whitespace errors.

- [ ] **Step 3: Commit the release-record skeleton**

Run:

```powershell
git add docs/deployment/zhensuan-1.0-final-release-record.md
git commit -m "docs: add final release record"
```

Expected: commit succeeds and does not include `miniprogram/project.config.json`.

## Task 2: Run Local Completion Verification

**Files:**

- Modify: `docs/deployment/zhensuan-1.0-final-release-record.md`
- Read: `package.json`
- Read: `scripts/validate-miniprogram.mjs`
- Read: `tests/test_phase_admin_scaffold.py`
- Read: `tests/test_phase6_online_integration_scaffold.py`

- [ ] **Step 1: Verify service tests**

Run:

```powershell
npm run test:server
```

Expected: all Node tests pass. Record the pass count or final success line in the release record.

- [ ] **Step 2: Verify Python scaffold checks**

Run:

```powershell
npm run test:py
```

Expected: all Python unittest checks pass. Record the final `OK` line in the release record.

- [ ] **Step 3: Verify native mini-program static checks**

Run:

```powershell
npm run test:miniprogram
```

Expected output includes:

```text
miniprogram_static_ok=
json_files_ok=
native_pages_ok=
```

Also confirm the output does not report React, WebView wrapper, old branding, or wrong AppID.

- [ ] **Step 4: Verify TypeScript**

Run:

```powershell
npm run lint
```

Expected: `tsc --noEmit` exits with code 0.

- [ ] **Step 5: Verify production build**

Run:

```powershell
npm run build
```

Expected: Vite build completes. Existing chunk-size warnings are acceptable only if the build exits with code 0.

- [ ] **Step 6: Update the release record with local evidence**

Edit `docs/deployment/zhensuan-1.0-final-release-record.md` so the local verification table contains concrete command results. Use this style:

```markdown
| 服务端测试 | `npm run test:server` | 通过 | 83 tests passed |
```

- [ ] **Step 7: Commit local verification evidence**

Run:

```powershell
git add docs/deployment/zhensuan-1.0-final-release-record.md
git commit -m "docs: record local release verification"
```

Expected: commit succeeds and includes only the release record.

## Task 3: Verify Server Deployment

**Files:**

- Modify: `docs/deployment/zhensuan-1.0-final-release-record.md`
- Modify: `docs/deployment/zhensuan-online-verification.md`
- Read: `docs/deployment/zhensuan-online-runbook.md`

- [ ] **Step 1: Verify public API health**

Run:

```powershell
curl.exe -fsS https://www.goye.cc/destiny-api/health
```

Expected JSON includes:

```json
{"ok":true}
```

- [ ] **Step 2: Verify H5 page responds**

Run:

```powershell
curl.exe -fsSI https://www.goye.cc
```

Expected: HTTP status is `200`.

- [ ] **Step 3: Verify admin page responds**

Run:

```powershell
curl.exe -fsSI https://www.goye.cc/admin
```

Expected: HTTP status is `200`.

- [ ] **Step 4: Verify server services through SSH**

Run from a trusted terminal with existing server access:

```powershell
ssh root@170.106.113.176 "cd /var/www/destiny && git rev-parse --short HEAD && npm run db:migrate && npm run graph:seed && pm2 status destiny-api --no-color"
```

Expected:

- `npm run db:migrate` exits successfully.
- `npm run graph:seed` exits successfully.
- PM2 shows `destiny-api` online.

- [ ] **Step 5: Verify admin graph and provenance manually**

Open:

```text
https://www.goye.cc/admin
```

Log in as a platform admin and verify:

- Knowledge entries page can list entries.
- Rules page can list rules.
- Templates page can list templates.
- Ontology graph page renders nodes and edges.
- Report records page can display provenance for a report.

- [ ] **Step 6: Update deployment verification docs**

Append a new section to `docs/deployment/zhensuan-online-verification.md`:

```markdown
## 2026-05-30 甄好算 1.0 最终上线前验证

- API 健康检查：通过，`/destiny-api/health` 返回 `ok: true`。
- H5 首页：通过，`https://www.goye.cc` 返回 200。
- 后台入口：通过，`https://www.goye.cc/admin` 返回 200。
- PostgreSQL 迁移：通过。
- Neo4j 种子：通过。
- PM2 服务：`destiny-api` 在线。
- 后台图谱：通过，节点和边可视化显示。
- 报告溯源：通过，报告记录可查看规则、知识和图谱路径。
```

- [ ] **Step 7: Commit server verification evidence**

Run:

```powershell
git add docs/deployment/zhensuan-1.0-final-release-record.md docs/deployment/zhensuan-online-verification.md
git commit -m "docs: record server release verification"
```

Expected: commit succeeds and contains only deployment documentation.

## Task 4: Upload Native Mini-Program

**Files:**

- Modify: `docs/deployment/zhensuan-1.0-final-release-record.md`
- Modify: `docs/miniprogram-release.md`
- Read: `miniprogram/project.config.json`
- Read: `scripts/validate-miniprogram.mjs`

- [ ] **Step 1: Confirm AppID and native project config**

Run:

```powershell
Select-String -Path miniprogram\project.config.json -Pattern '"appid": "wxc4ed7c07ce86326c"','"compileType": "miniprogram"','"miniprogramRoot": "./"'
```

Expected: all three lines are present.

- [ ] **Step 2: Locate WeChat DevTools CLI**

Run:

```powershell
$cliCandidates = @(
  'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat',
  'C:\Program Files\Tencent\微信web开发者工具\cli.bat'
)
$wechatCli = $cliCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $wechatCli) { throw 'WeChat DevTools CLI not found' }
$wechatCli
```

Expected: prints the full path to `cli.bat`.

- [ ] **Step 3: Confirm WeChat DevTools login**

Run:

```powershell
& $wechatCli islogin
```

Expected:

```json
{"login":true}
```

If it returns `false`, open WeChat DevTools and log in with the current mini-program account before continuing.

- [ ] **Step 4: Generate preview build**

Run:

```powershell
& $wechatCli preview --project "D:\Projects\destiny\miniprogram"
```

Expected: preview compile succeeds and prints a package size.

- [ ] **Step 5: Upload version `1.0.0`**

Run:

```powershell
& $wechatCli upload --project "D:\Projects\destiny\miniprogram" -v "1.0.0" -d "甄好算1.0正式版：真实微信登录、知识库后台、图计算、图谱可视化、报告分层、商城、会员积分、罗盘、订单退款发货闭环"
```

Expected: upload succeeds and prints an upload success result.

- [ ] **Step 6: Verify development version in WeChat public platform**

Open WeChat public platform:

```text
https://mp.weixin.qq.com/
```

Check:

- The current account shows mini-program AppID `wxc4ed7c07ce86326c`.
- Version management shows development version `1.0.0`.
- The upload description matches the command in Step 5.

Do not submit for review or publish unless the user explicitly asks for those additional actions.

- [ ] **Step 7: Update mini-program release docs**

Update `docs/miniprogram-release.md` so the upload section records:

```markdown
当前已通过 CLI 上传开发版本 `1.0.0`，备注为“甄好算1.0正式版：真实微信登录、知识库后台、图计算、图谱可视化、报告分层、商城、会员积分、罗盘、订单退款发货闭环”。
```

Also update `docs/deployment/zhensuan-1.0-final-release-record.md` with the version, description, and upload result.

- [ ] **Step 8: Commit mini-program upload evidence**

Run:

```powershell
git add docs/miniprogram-release.md docs/deployment/zhensuan-1.0-final-release-record.md
git commit -m "docs: record mini-program upload"
```

Expected: commit succeeds and does not stage `miniprogram/project.config.json` unless there is an intentional release config change.

## Task 5: Send Completion Email

**Files:**

- Modify: `docs/deployment/zhensuan-1.0-final-release-record.md`

- [ ] **Step 1: Confirm email recipient**

Use the email address explicitly provided by the user for final notifications. If no recipient email exists in the thread or project notes, ask the user for the recipient address before marking this task complete.

- [ ] **Step 2: Draft the email**

Use this subject:

```text
甄好算 1.0 小程序已上传
```

Use this body:

```text
甄好算 1.0 已完成最终上传。

完成内容：
1. A 商业运营版与 B 专业知识库版已按冻结范围完成验证。
2. 真实微信支付和真实腾讯云短信未接入，仍按 1.0 范围保留占位。
3. 手机号登录为模拟验证码流程，微信小程序登录为真实 wx.login 链路。
4. 图计算和图谱可视化已纳入后台验证。
5. 原生微信小程序已上传到当前微信小程序账号，版本号为 1.0.0。

后台地址：https://www.goye.cc/admin
H5 地址：https://www.goye.cc
API 健康检查：https://www.goye.cc/destiny-api/health

下一步可在微信公众平台版本管理中查看开发版本，并按需要提交审核。
```

- [ ] **Step 3: Send the email**

Use the connected Gmail tool or a user-approved mail client. If using Gmail, send only after the user has authorized the recipient and content.

Expected: the email is sent successfully, with subject `甄好算 1.0 小程序已上传`.

- [ ] **Step 4: Record email evidence**

Update `docs/deployment/zhensuan-1.0-final-release-record.md`:

```markdown
| 收件人 | user@example.com |
| 邮件主题 | `甄好算 1.0 小程序已上传` |
| 发送状态 | 已发送 |
```

Replace `user@example.com` with the real recipient address.

- [ ] **Step 5: Commit email evidence**

Run:

```powershell
git add docs/deployment/zhensuan-1.0-final-release-record.md
git commit -m "docs: record completion email"
```

Expected: commit succeeds.

## Task 6: Final Goal Completion Audit

**Files:**

- Read: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-scope-freeze.md`
- Read: `docs/superpowers/specs/2026-05-30-zhensuan-1.0-full-scope-design.md`
- Read: `docs/deployment/zhensuan-1.0-final-release-record.md`
- Read: `docs/deployment/zhensuan-online-verification.md`
- Read: `docs/miniprogram-release.md`

- [ ] **Step 1: Audit every explicit scope item**

Create a checklist from the frozen scope and verify each item against direct evidence:

```text
A commercial operations: evidence in tests, admin pages, and server verification.
B professional knowledge base: evidence in publishing workflow, graph, and provenance verification.
No real WeChat Pay: evidence in provider and settings status.
No real Tencent SMS: evidence in mock SMS provider and SMS logs.
Simulated phone login: evidence in customer OTP tests.
Real WeChat login: evidence in provider tests and mini-program login flow.
Graph computation: evidence in graph query tests and server verification.
Graph visualization: evidence in admin UI build and manual verification.
Mini-program upload: evidence in WeChat DevTools CLI output and release docs.
Email notification: evidence in sent mail and release record.
```

- [ ] **Step 2: Run final working tree check**

Run:

```powershell
git status --short
```

Expected: no unexpected changed files. The known `miniprogram/project.config.json` change may remain unstaged if it was not intentionally included.

- [ ] **Step 3: Decide whether the active goal is complete**

Only mark the goal complete after all evidence is present:

- All local tests passed.
- Server verification passed.
- Mini-program version `1.0.0` uploaded to AppID `wxc4ed7c07ce86326c`.
- Completion email sent.
- No required scope item remains unverified.

If any evidence is missing, continue implementation or verification instead of marking the goal complete.
