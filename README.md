# 甄好算 (Zhensuan)

AI 传统文化/人生参考工具 + 电商。微信小程序原生端 + React 网页端 + Node 后端**三端一体**。

四类 AI 报告——**照见（life）/ 合缘（relationship）/ 问时（question）/ 安居（space）**，免费版截断、完整版付费；内置商城卖虚拟权益与实物商品（订单 / 退款 / 物流 / 积分 / 会员 / 成长等级闭环）。

> 报告内容为传统文化参考，不构成医疗、投资、法律建议。

---

## 三端架构

| 端 | 目录 | 技术 | 说明 |
|---|---|---|---|
| 小程序 | `miniprogram/` | 微信原生 (WXML/WXSS/JS) | C 端生产客户端，13 页，appid `wxc4ed7c07ce86326c` |
| 网页 | `src/` | React 19 + Vite 6 + Tailwind 4 | `/admin/*` 进 21 页管理后台；其余为 C 端网页版 |
| 后端 | `server/` | Node + Express 4 + PostgreSQL + Neo4j + Gemini | 共享 API，挂载前缀 `/destiny-api` |

`miniprogram/` 与 `src/` 是**两套独立代码**（非 Taro 编译关系），共用同一套后端 API 与 JSON 数据契约。验收脚本强制小程序不得引入 React/web-view，保证纯原生。

```
            ┌─────────────────────────────────────┐
            │      server/  (Node + Express)       │
            │   挂载前缀: /destiny-api            │
            │   routes / graph / rules / reports  │
            │   / commerce / entitlements / auth  │
            │   DB: PostgreSQL + Neo4j            │
            └──────────────┬──────────────────────┘
                           │ 统一 API
          ┌────────────────┼────────────────┐
          │                │                │
 ┌────────▼────────┐  ┌────▼─────┐  ┌───────▼────────┐
 │ miniprogram/    │  │  src/    │  │  src/admin/     │
 │ 原生小程序       │  │ 网页C端  │  │  AdminApp(21页) │
 │ 13页 · 生产C端   │  │ App.tsx  │  │  管理后台       │
 └─────────────────┘  └──────────┘  └────────────────┘
```

---

## 技术栈

- **网页前端**：React 19、Vite 6、Tailwind 4、lucide-react、motion
- **小程序**：微信原生，libVersion 3.15.2
- **后端**：Express 4.21、PostgreSQL (`pg`)、Neo4j (`neo4j-driver`，八字本体图谱)、Google Gemini (`@google/genai`)、lunar-javascript（农历）、qrcode
- **构建/测试**：Vite、esbuild、tsx、tsc；`node --test` + python unittest

---

## 快速开始

**前置**：Node.js（建议 18+）。完整后端运行还需 PostgreSQL 与 Neo4j 实例。

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
#    在项目根目录创建 .env.local，填入：
#    GEMINI_API_KEY=<你的 Gemini 密钥>
#    以及 PostgreSQL / Neo4j 连接串（见 server/ 配置）

# 3. 网页前端开发（端口 3000）
npm run dev

# 4. 启动后端
npm start

# 5. 数据库迁移
npm run db:migrate

# 6. （可选）种子化 Neo4j 八字本体图谱
npm run graph:seed
```

**小程序**：用微信开发者工具打开 `miniprogram/` 目录，AppID 填 `wxc4ed7c07ce86326c`。

---

## 脚本命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | Vite 开发服务器（端口 3000） |
| `npm run build` | 构建网页前端到 `dist/` |
| `npm start` | 启动后端服务 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run admin:create` | 创建管理员账号 |
| `npm run graph:seed` | 种子化 Neo4j 八字本体图谱 |
| `npm run test:server` | 后端测试 (`node --test`) |
| `npm run test:py` | Python 验收脚手架测试 |
| `npm run test:miniprogram` | 小程序脚手架校验 |
| `npm run lint` | TypeScript 类型检查 |

---

## 关键目录

| 路径 | 作用 |
|---|---|
| `miniprogram/app.js` / `app.json` / `app.wxss` | 小程序全局配置（含 `globalData.apiBase`） |
| `miniprogram/utils/api.js` / `auth.js` / `fallback.js` | API 封装 / 鉴权 / 报告兜底 |
| `miniprogram/pages/` | 13 个页面（home/store/me/login/life/relationship/question/space/compass/address/orders/report/legal） |
| `src/main.tsx` / `App.tsx` / `admin/AdminApp.tsx` | 网页入口与后台 |
| `src/lib/insights.ts` / `customerAuth.ts` / `customerCommerce.ts` | 网页端 API 封装 |
| `server/app.mjs` / `index.mjs` | 后端入口 |
| `server/db/migrate.mjs` + `*.sql` | 数据库迁移（phase1~11） |
| `server/graph/seed-bazi-ontology.mjs` | 八字本体图谱种子 |

---

## 配置

- **小程序 API 地址**：`miniprogram/app.js` 的 `globalData.apiBase`（`utils/api.js` 自动读取，改一处即全端生效）
- **网页 API 地址**：相对路径 `/destiny-api/...`（由 Vite 代理或同域部署）

---

## 报告生成链路

```
表单提交 → /generate
  → context-builder 组装上下文（知识库 + 图谱路径）
  → Gemini 生成报告
  → safety-review 安全审查
  → 存库 + 返回（失败走 buildFallbackReport 本地兜底）
  → 报告带 provenance: ruleHits / knowledgeSources / graphEdges（可溯源）
```

免费版分层截断（`applyReportTier`）：keywords ≤ 3、sections ≤ 2、actions ≤ 3 + 升级提示。
