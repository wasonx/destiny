# 甄好算线上验证记录

## 2026-05-30 验证结果

已完成：

- H5 访问：`https://www.goye.cc` 返回 200，浏览器可见首页标题和客户登录区。
- 后台访问：`https://www.goye.cc/admin` 返回 200，浏览器可见后台登录页。
- API 健康：`https://www.goye.cc/destiny-api/health` 返回 `ok: true`。
- PM2 服务：`destiny-api` 在线运行，监听 `127.0.0.1:3201`。
- PostgreSQL：迁移已执行到 `006_phase5_commerce_seed.sql`，已写入默认会员计划、报告次数包、实物罗盘卡和初始库存。
- Neo4j：已安装 Neo4j Community `2026.05.0`，Bolt 监听本机，八字本体种子已写入 36 个 `Concept` 节点。
- MedusaJS：已部署独立 Medusa 后端，PM2 服务名为 `zhensuan-medusa`，本机 `http://127.0.0.1:9000/health` 返回 `OK`。
- 甄好算运维健康：管理员登录后访问 `/destiny-api/admin/ops/health`，已显示 `api/postgres/neo4j/medusa` 全部为 `ok`。
- 后台管理员：已创建初始化管理员账号，密码保存在服务器 `/root/zhensuan-admin-bootstrap.txt`，权限为 `600`。
- 报告生成：线上 `/destiny-api/generate` 可返回完整报告结构，包含 `title`、`sections`、`source` 和安全审查结果；客户带 token 生成报告时会扣减 1 次报告权益，余额不足返回 `402`。
- 线上商业闭环：已验证客户验证码登录、创建报告次数包订单、后台标记支付成功、自动发放 3 次报告权益、生成报告扣减 1 次、后台发放记录落库。
- 后台安全：生产环境除 `/destiny-api/admin/login` 外，其它 `/destiny-api/admin/*` 接口均要求管理员或编辑会话。
- 原生小程序文件：服务器 `/var/www/destiny/miniprogram` 已包含 AppID、正式 API 域名、原生罗盘页面、微信罗盘 API 调用，以及原生商城、收货地址、订单和退款页面。
- 小程序静态验证：本地已完成 `npm run test:miniprogram`，检查原生页面文件、AppID、正式 API 域名、JS 语法、JSON 配置、罗盘 API、商城/收货地址/订单/退款页面，共检查 14 个 JS 文件和 14 个 JSON 文件；`project.config.json` AppID 为 `wxc4ed7c07ce86326c`。
- 微信开发者工具 CLI：已开启服务端口，`islogin` 返回 `{"login":true}`；`preview --project miniprogram` 编译通过，预览包体约 43.5 KB。
- 小程序开发版本上传：已通过微信开发者工具 CLI 上传版本 `0.1.0`，描述为“甄好算原生小程序MVP，含报告、罗盘、商城、订单和退款流程”，上传包体约 43.9 KB。

第一版外部接口边界：

- MedusaJS 已完成独立服务部署和健康检查接入；第一版线上交易闭环使用甄好算本地轻商城表，Medusa 双向同步作为后续增强，不阻塞当前上线验收。
- 真实腾讯云短信、真实微信支付、真实快递和真实退款接口仍为预留/模拟实现。

## 下一步

1. 在微信公众平台「版本管理」中查看开发版本 `0.1.0`，按平台要求提交审核；审核通过后点击发布。
2. 接入真实腾讯云短信、微信支付、快递和退款接口。
3. 需要更复杂商品运营时，再接入 Medusa 商品/库存/订单同步。

## 2026-07-07 小程序审核通过后验证

- 小程序审核状态：已通过。
- 本地小程序静态验证：`npm run test:miniprogram` 通过，输出 `miniprogram_static_ok=17`、`json_files_ok=23`、`native_pages_ok=13`。
- 服务端测试：`npm run test:server` 通过，94 项全部通过。
- Python 验收测试：`npm run test:py` 通过，44 项全部通过。
- TypeScript 检查：`npm run lint` 通过。
- Web 构建：`npm run build` 通过；Vite 仍提示 chunk-size 警告，不影响构建产物。
- API 健康检查：`https://www.goye.cc/destiny-api/health` 返回 `ok: true`。
- H5 首页：`https://www.goye.cc` 返回 HTTP 200。
- 后台入口：`https://www.goye.cc/admin` 返回 HTTP 200。
- 正式发布动作：需要在微信公众平台「管理 > 版本管理 > 审核版本 > 发布」手动点击完成。

## 2026-07-07 微信支付开发版接入记录

- 后端新增微信支付 JSAPI provider，包含 API v3 请求签名、小程序支付参数签名、通知资源解密和通知验签入口。
- 后端新增支付通知地址：`https://www.goye.cc/destiny-api/payments/wechat/notify`。
- 小程序商城改为优先请求 `wechat_jsapi`，服务器未开启或未配置微信支付时自动降级为待确认订单。
- 后台集成设置新增微信支付状态展示，只展示配置状态和缺失项名称，不展示密钥。
- 验证结果：`npm run test:server` 101 项通过，`npm run test:py` 44 项通过，`npm run lint` 通过，`npm run build` 通过，`npm run test:miniprogram` 输出 `miniprogram_static_ok=17`、`json_files_ok=23`、`native_pages_ok=13`。
- 微信开发者工具 CLI 预览通过，预览包体约 293.8 KB。
- 已上传微信小程序开发版 `1.0.2`，备注为“甄好算小程序：新增微信支付JSAPI通道，未配置商户资料时自动降级为待确认订单”，上传包体约 588.3 KB。
- 后端服务器已同步部署本次微信支付代码。线上健康检查 `https://www.goye.cc/destiny-api/health` 返回 `ok: true`；支付通知路由 `POST /destiny-api/payments/wechat/notify` 已生效，当前因 `WECHAT_PAY_ENABLED=false` 返回 `WECHAT_PAY_DISABLED`。微信支付商户资料配置完成后才能打开 `WECHAT_PAY_ENABLED=true`。

## 2026-05-30 甄好算 1.0 最终上线前验证

- 发布分支：服务器已部署 `origin/codex/zhensuan-full-build`，当前 commit 为 `3755c1f`。
- 部署备份：切换 1.0 代码前已创建 `/root/destiny-backup-20260530-131550.tar.gz`。
- 本地验证：`npm run test:server` 94 项通过，`npm run test:py` 44 项通过，`npm run test:miniprogram` 输出 `miniprogram_static_ok=16`、`json_files_ok=16`、`native_pages_ok=12`，`npm run lint` 通过，`npm run build` 通过。
- 服务器验证：服务器端 `npm run test:server` 94 项通过，`npm run build` 通过，PM2 `destiny-api` 在线。
- API 健康检查：`https://www.goye.cc/destiny-api/health` 返回 `ok: true`。
- H5 首页：`https://www.goye.cc` 返回 HTTP 200。
- 后台入口：`https://www.goye.cc/admin` 返回 HTTP 200。
- 合规接口：`https://www.goye.cc/destiny-api/legal` 返回 1.0 用户协议、隐私政策和报告分层说明。
- PostgreSQL 迁移：本次部署应用 `007_phase7_wechat_identity.sql` 至 `011_phase11_sms_mock_boundaries.sql`。
- Neo4j 种子：`npm run graph:seed` 输出 `bazi ontology seeded`。
- 运维健康：后台登录后 `/destiny-api/admin/ops/health` 显示 `api/postgres/neo4j/medusa` 全部为 `ok`。
- 图谱健康：后台登录后 `/destiny-api/admin/graph/health` 返回 `ok: true`，概念接口返回 37 个概念。
- 报告溯源：线上验证报告 `d3ce576d-ff08-494a-ac5c-33ccaabf9e27` 的报告图谱接口返回 8 个节点和 10 条边，`report_provenance_records` 中 `graph_nodes` 与 `rule_hits` 均为 JSON array。
- 小程序上传：已通过微信开发者工具 CLI 上传开发版本 `1.0.0`，AppID 为 `wxc4ed7c07ce86326c`，备注为“甄好算1.0正式版：真实微信登录、知识库后台、图计算、图谱可视化、报告分层、商城、会员积分、罗盘、订单退款发货闭环”，包体约 66.0 KB。
- 外部接口边界：真实微信支付、真实微信退款、真实腾讯云短信和真实快递接口仍未接入，符合 1.0 范围冻结口径。
