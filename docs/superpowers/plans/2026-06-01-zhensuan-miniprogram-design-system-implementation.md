# 甄算小程序设计系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将原生微信小程序界面统一到 Web 端甄算视觉语言，建立可复用的小程序设计系统，并保持现有业务逻辑不变。

**Architecture:** 先扩展 `scripts/validate-miniprogram.mjs`，让静态验收覆盖设计系统类、页面覆盖和关键业务能力。再改 `miniprogram/app.wxss` 提供统一 token、卡片、按钮、表单、标签和状态类。最后按页面分组改 WXML/WXSS，尽量复用全局类，页面样式只保留局部布局。

**Tech Stack:** 原生微信小程序 WXML/WXSS/JS、Node.js 静态验证脚本、微信开发者工具 CLI。

---

## File Structure

- Modify: `scripts/validate-miniprogram.mjs`
  - 增加设计系统静态验收，检查全局类、页面类使用、首页主行动按钮、报告溯源展示、罗盘原生能力。
- Modify: `miniprogram/app.wxss`
  - 建立小程序全局设计系统：页面、hero、卡片、表单、按钮、pill、message、empty、报告块。
- Modify: `miniprogram/pages/home/index.wxml`
  - 增加首页主行动按钮，入口卡片改用设计系统 accent card。
- Modify: `miniprogram/pages/home/index.wxss`
  - 只保留首页入口色条、登录条和卡片局部布局。
- Modify: `miniprogram/pages/login/index.wxml`
  - 微信登录与手机号模拟登录统一成设计系统卡片和提示。
- Modify: `miniprogram/pages/login/index.wxss`
  - 删除重复按钮/卡片样式，保留登录页局部布局。
- Modify: `miniprogram/pages/life/index.wxml`
- Modify: `miniprogram/pages/relationship/index.wxml`
- Modify: `miniprogram/pages/question/index.wxml`
- Modify: `miniprogram/pages/space/index.wxml`
  - 表单页面统一使用 `zs-card`、`form-help`、`pill` 和统一底部 notice。
- Modify: `miniprogram/pages/report/index.wxml`
- Modify: `miniprogram/pages/report/index.wxss`
  - 报告页改为 Web 同款阅读层级：报告头、升级提示、核心摘要、段落左色条、行动建议、溯源。
- Modify: `miniprogram/pages/store/index.wxml`
- Modify: `miniprogram/pages/store/index.wxss`
  - 商城改为指标卡、商品卡和统一按钮/提示。
- Modify: `miniprogram/pages/address/index.wxml`
- Modify: `miniprogram/pages/address/index.wxss`
- Modify: `miniprogram/pages/orders/index.wxml`
- Modify: `miniprogram/pages/orders/index.wxss`
  - 地址和订单页改为统一运营面板风格，状态使用 pill。
- Modify: `miniprogram/pages/compass/index.wxml`
- Modify: `miniprogram/pages/compass/index.wxss`
  - 罗盘页保留拟物罗盘，读数和记录结果改为系统卡片。
- Modify: `miniprogram/pages/legal/index.wxml`
- Modify: `miniprogram/pages/legal/index.wxss`
  - 合规页按卡片分组，提高阅读感。

## Task 1: Add Design-System Static Checks

**Files:**
- Modify: `scripts/validate-miniprogram.mjs`

- [ ] **Step 1: Write failing validation checks**

Add checks after existing `compassJs` assertions:

```js
const appWxss = readText(path.join(MINI, 'app.wxss'));
const homeWxml = readText(path.join(MINI, 'pages', 'home', 'index.wxml'));
const reportWxss = readText(path.join(MINI, 'pages', 'report', 'index.wxss'));
const designClasses = [
  '.zs-card',
  '.zs-card-accent',
  '.zs-card-gold',
  '.zs-card-teal',
  '.teal-button',
  '.ghost-button',
  '.pill',
  '.pill-gold',
  '.pill-teal',
  '.pill-red',
  '.form-help',
  '.message',
];
for (const className of designClasses) {
  assert(appWxss.includes(className), `app.wxss must define design system class ${className}`);
}
assert(homeWxml.includes('开始生成参考'), 'home page must include Web-aligned primary action');
assert(homeWxml.includes('zs-card-accent'), 'home page must use accent cards for module entries');
assert(reportWxml.includes('report-section-card'), 'report page must use section cards for report sections');
assert(reportWxml.includes('action-index'), 'report page must render numbered action items');
assert(reportWxss.includes('report-section-card'), 'report wxss must style section cards');
```

- [ ] **Step 2: Run validation and verify RED**

Run:

```bash
npm run test:miniprogram
```

Expected: FAIL with messages about missing design system classes or missing `zs-card-accent`.

## Task 2: Implement Global Design System

**Files:**
- Modify: `miniprogram/app.wxss`

- [ ] **Step 1: Replace global style foundation**

Rewrite `app.wxss` to keep existing base classes and add design system classes:

```css
page { background: #fdfcf8; color: #1a2f4b; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
.page { min-height: 100vh; padding: 32rpx; box-sizing: border-box; background: #fdfcf8; }
.hero { padding: 36rpx 0 28rpx; text-align: center; }
.brand { color: #b89150; font-size: 23rpx; letter-spacing: 4rpx; margin-bottom: 18rpx; }
.title { color: #1a2f4b; font-size: 42rpx; font-weight: 700; line-height: 1.35; }
.subtitle { color: #6b7280; font-size: 27rpx; line-height: 1.7; margin-top: 18rpx; }
.section, .zs-card { background: #ffffff; border: 1rpx solid #e5e7eb; border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; box-sizing: border-box; }
.zs-card-accent { position: relative; background: #ffffff; border: 1rpx solid #e5e7eb; border-radius: 16rpx; padding: 30rpx 30rpx 30rpx 38rpx; margin-bottom: 24rpx; overflow: hidden; box-sizing: border-box; }
.zs-card-accent::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx; background: #4a7c77; }
.zs-card-gold { border-color: rgba(184, 145, 80, 0.35); background: rgba(184, 145, 80, 0.08); }
.zs-card-teal { border-color: rgba(74, 124, 119, 0.28); background: rgba(74, 124, 119, 0.08); }
.section-title { color: #1a2f4b; font-size: 34rpx; font-weight: 700; margin-bottom: 20rpx; }
.field { margin-bottom: 26rpx; }
.label { display: block; color: #6b7280; font-size: 24rpx; margin-bottom: 12rpx; }
.input, .textarea { width: 100%; min-height: 84rpx; border: 1rpx solid #e5e7eb; border-radius: 12rpx; padding: 20rpx; box-sizing: border-box; color: #1a2f4b; background: #f9fafb; font-size: 30rpx; }
.textarea { min-height: 180rpx; line-height: 1.6; }
.form-help { color: #6b7280; font-size: 23rpx; line-height: 1.6; margin-top: 14rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip, .pill { border: 1rpx solid #e5e7eb; border-radius: 999rpx; color: #1a2f4b; background: #ffffff; font-size: 24rpx; padding: 12rpx 22rpx; }
.chip.active, .pill-teal { color: #ffffff; background: #4a7c77; border-color: #4a7c77; }
.pill-gold { color: #1a2f4b; background: rgba(184, 145, 80, 0.12); border-color: rgba(184, 145, 80, 0.35); }
.pill-red { color: #c84b31; background: rgba(200, 75, 49, 0.08); border-color: rgba(200, 75, 49, 0.28); }
.primary-button, .teal-button, .secondary-button, .ghost-button { min-height: 92rpx; border-radius: 16rpx; font-size: 30rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.primary-button { width: 100%; background: #1a2f4b; color: #ffffff; font-weight: 600; }
.teal-button { width: 100%; background: #4a7c77; color: #ffffff; font-weight: 600; }
.secondary-button { border: 1rpx solid #e5e7eb; color: #1a2f4b; background: #ffffff; }
.ghost-button { color: #4a7c77; background: transparent; }
.notice { color: #9ca3af; font-size: 23rpx; line-height: 1.6; text-align: center; margin-top: 24rpx; }
.empty { color: #9ca3af; font-size: 28rpx; padding: 80rpx 0; text-align: center; }
.message { border-radius: 12rpx; background: rgba(74, 124, 119, 0.08); border: 1rpx solid rgba(74, 124, 119, 0.24); color: #4a7c77; font-size: 24rpx; line-height: 1.6; padding: 18rpx 20rpx; }
```

- [ ] **Step 2: Run validation**

Run:

```bash
npm run test:miniprogram
```

Expected: still FAIL because page WXML has not migrated yet.

## Task 3: Migrate Home and Form Pages

**Files:**
- Modify: `miniprogram/pages/home/index.wxml`
- Modify: `miniprogram/pages/home/index.wxss`
- Modify: `miniprogram/pages/life/index.wxml`
- Modify: `miniprogram/pages/relationship/index.wxml`
- Modify: `miniprogram/pages/question/index.wxml`
- Modify: `miniprogram/pages/space/index.wxml`

- [ ] **Step 1: Home page structure**

Use `zs-card-teal` for login and `zs-card-accent` for entries. Add a primary action button with `开始生成参考`.

- [ ] **Step 2: Form page cards**

Replace form sections with `section zs-card`; replace section helper text with `form-help`; keep all `name` attributes unchanged.

- [ ] **Step 3: Run validation**

Run:

```bash
npm run test:miniprogram
```

Expected: FAIL only on report page design-system checks if report is not migrated yet.

## Task 4: Migrate Report Page

**Files:**
- Modify: `miniprogram/pages/report/index.wxml`
- Modify: `miniprogram/pages/report/index.wxss`

- [ ] **Step 1: Report WXML**

Add `zs-card`, `zs-card-gold`, `report-section-card`, and `action-index` classes while preserving `historyRuns`, `provenanceSummary`, `goHome`, and data bindings.

- [ ] **Step 2: Report WXSS**

Style `report-section-card` with a left teal bar and `action-index` as a numbered teal circle. Keep provenance groups readable.

- [ ] **Step 3: Run validation**

Run:

```bash
npm run test:miniprogram
```

Expected: PASS if global design classes and required page classes are present.

## Task 5: Migrate Commerce, Account, Compass, and Legal Pages

**Files:**
- Modify: `miniprogram/pages/store/index.wxml`
- Modify: `miniprogram/pages/store/index.wxss`
- Modify: `miniprogram/pages/address/index.wxml`
- Modify: `miniprogram/pages/address/index.wxss`
- Modify: `miniprogram/pages/orders/index.wxml`
- Modify: `miniprogram/pages/orders/index.wxss`
- Modify: `miniprogram/pages/login/index.wxml`
- Modify: `miniprogram/pages/login/index.wxss`
- Modify: `miniprogram/pages/compass/index.wxml`
- Modify: `miniprogram/pages/compass/index.wxss`
- Modify: `miniprogram/pages/legal/index.wxml`
- Modify: `miniprogram/pages/legal/index.wxss`

- [ ] **Step 1: Store/address/orders**

Use metric cards, `pill` statuses, `zs-card` containers, and global button classes. Keep all `bindtap`, `picker`, and API-related data bindings unchanged.

- [ ] **Step 2: Login**

Use `zs-card-teal` for WeChat login and `zs-card` for phone OTP. Keep `bindtap` and `bindsubmit` handlers unchanged.

- [ ] **Step 3: Compass**

Keep `wx.startCompass`, `wx.onCompassChange`, and storage logic unchanged. Move readout and recorded result into system cards.

- [ ] **Step 4: Legal**

Use `zs-card` and `pill-red` for risk boundary sections, preserving API-loaded text.

- [ ] **Step 5: Run validation**

Run:

```bash
npm run test:miniprogram
```

Expected: PASS.

## Task 6: Final Verification and Commit

**Files:**
- Modified implementation files from Tasks 1-5.

- [ ] **Step 1: Run mini-program validation**

Run:

```bash
npm run test:miniprogram
```

Expected: `miniprogram_static_ok=16`, `json_files_ok=16`, `native_pages_ok=12`.

- [ ] **Step 2: Run WeChat DevTools preview**

Run:

```powershell
& 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat' preview --project 'D:\Projects\destiny\miniprogram'
```

Expected: preview succeeds using AppID `wxc4ed7c07ce86326c`.

- [ ] **Step 3: Check git diff**

Run:

```bash
git diff --stat
git status --short
```

Expected: only intended docs, validation, and miniprogram UI files are changed; existing `miniprogram/project.config.json` remains unrelated and should not be staged.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/validate-miniprogram.mjs miniprogram/app.wxss miniprogram/pages docs/superpowers/plans/2026-06-01-zhensuan-miniprogram-design-system-implementation.md
git commit -m "style: unify miniprogram design system"
```

Expected: commit succeeds without staging `miniprogram/project.config.json` unless it contains only intentional design-system changes, which it should not.
