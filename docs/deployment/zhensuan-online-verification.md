# 甄算线上验证记录

## 2026-05-30 验证结果

已完成：

- H5 访问：`https://www.goye.cc` 返回 200，浏览器可见首页标题和客户登录区。
- 后台访问：`https://www.goye.cc/admin` 返回 200，浏览器可见后台登录页。
- API 健康：`https://www.goye.cc/destiny-api/health` 返回 `ok: true`。
- PM2 服务：`destiny-api` 在线运行，监听 `127.0.0.1:3201`。
- PostgreSQL：迁移已执行到 `006_phase5_commerce_seed.sql`，已写入默认会员计划、报告次数包、实物罗盘卡和初始库存。
- Neo4j：已安装 Neo4j Community `2026.05.0`，Bolt 监听本机，八字本体种子已写入 36 个 `Concept` 节点。
- MedusaJS：已部署独立 Medusa 后端，PM2 服务名为 `zhensuan-medusa`，本机 `http://127.0.0.1:9000/health` 返回 `OK`。
- 甄算运维健康：管理员登录后访问 `/destiny-api/admin/ops/health`，已显示 `api/postgres/neo4j/medusa` 全部为 `ok`。
- 后台管理员：已创建初始化管理员账号，密码保存在服务器 `/root/zhensuan-admin-bootstrap.txt`，权限为 `600`。
- 报告生成：线上 `/destiny-api/generate` 可返回完整报告结构，包含 `title`、`sections`、`source` 和安全审查结果；客户带 token 生成报告时会扣减 1 次报告权益，余额不足返回 `402`。
- 线上商业闭环：已验证客户验证码登录、创建报告次数包订单、后台标记支付成功、自动发放 3 次报告权益、生成报告扣减 1 次、后台发放记录落库。
- 后台安全：生产环境除 `/destiny-api/admin/login` 外，其它 `/destiny-api/admin/*` 接口均要求管理员或编辑会话。
- 原生小程序文件：服务器 `/var/www/destiny/miniprogram` 已包含 AppID、正式 API 域名、原生罗盘页面、微信罗盘 API 调用，以及原生商城、收货地址、订单和退款页面。
- 小程序静态验证：本地已完成原生小程序 JS 语法检查和 JSON 配置解析检查，共检查 14 个 JS 文件；`project.config.json` AppID 为 `wxc4ed7c07ce86326c`。

第一版外部接口边界：

- MedusaJS 已完成独立服务部署和健康检查接入；第一版线上交易闭环使用甄算本地轻商城表，Medusa 双向同步作为后续增强，不阻塞当前上线验收。
- 微信开发者工具 CLI 在当前本机环境中 `islogin/open` 未返回结果，暂无法自动生成真机预览二维码；当前已完成原生文件、AppID、接口域名、JS/JSON 静态检查和线上 API 闭环验证。
- 真实腾讯云短信、真实微信支付、真实快递和真实退款接口仍为预留/模拟实现。

## 下一步

1. 在微信开发者工具人工登录后导入 `miniprogram/`，完成真机预览、接口请求和电子罗盘实机测试。
2. 接入真实腾讯云短信、微信支付、快递和退款接口。
3. 需要更复杂商品运营时，再接入 Medusa 商品/库存/订单同步。
