# 甄算线上验证记录

## 2026-05-30 验证结果

已完成：

- H5 访问：`https://www.goye.cc` 返回 200，浏览器可见首页标题和客户登录区。
- 后台访问：`https://www.goye.cc/admin` 返回 200，浏览器可见后台登录页。
- API 健康：`https://www.goye.cc/destiny-api/health` 返回 `ok: true`。
- PM2 服务：`destiny-api` 在线运行，监听 `127.0.0.1:3201`。
- PostgreSQL：迁移已执行到 `005_phase5_commerce_payment.sql`。
- Neo4j：已安装 Neo4j Community `2026.05.0`，Bolt 监听本机，八字本体种子已写入 36 个 `Concept` 节点。
- 后台管理员：已创建初始化管理员账号，密码保存在服务器 `/root/zhensuan-admin-bootstrap.txt`，权限为 `600`。
- 报告生成：线上 `/destiny-api/generate` 可返回完整报告结构，包含 `title`、`sections`、`source` 和安全审查结果。
- 原生小程序文件：服务器 `/var/www/destiny/miniprogram` 已包含 AppID、正式 API 域名、原生罗盘页面和微信罗盘 API 调用。

当前未完成：

- MedusaJS 独立商城底座尚未部署。当前线上商城能力来自甄算本地轻商城 API，不是独立 Medusa server/worker 生产部署。
- 微信开发者工具真机预览和提审前验证尚未在本机工具里执行；当前只完成了静态文件和接口域名检查。
- 真实腾讯云短信、真实微信支付、真实快递和真实退款接口仍为预留/模拟实现。

## 下一步

1. 部署独立 MedusaJS 应用，按官方生产建议准备 PostgreSQL、Redis、server mode 和 worker mode。
2. 将 `MEDUSA_HEALTH_URL` 写入甄算 `.env`，让 `/destiny-api/admin/ops/health` 显示 Medusa 正常。
3. 将甄算商品映射和 Medusa 商品/库存/订单进行同步。
4. 使用微信开发者工具导入 `miniprogram/`，完成真机预览、接口请求和电子罗盘测试。
