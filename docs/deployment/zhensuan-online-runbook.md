# 甄好算线上运行手册

## 服务组成

- Node/Express API：提供报告生成、账号登录、知识库后台、权益、商城和运维接口。
- Vite 静态前端：提供 H5 和 `/admin` 后台入口。
- PostgreSQL：保存账号、知识库、规则、报告、会员积分、订单、支付、退款和审计数据。
- Neo4j：保存八字本体图谱和概念关系。
- MedusaJS：作为未来商品底座边界，第一版本地轻商城已保留映射字段并接入健康检查。
- Nginx：负责 HTTPS、静态文件和 `/destiny-api` 反向代理。
- PM2：负责 Node API 和 Medusa 后端常驻运行、重启与进程列表保存。

## 关键环境变量

```env
DATABASE_URL=
SESSION_SECRET=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
CUSTOMER_AUTH_MOCKS_ENABLED=true
SMS_CODE_TTL_SECONDS=300
QR_LOGIN_TTL_SECONDS=180
TENCENT_SMS_SDK_APP_ID=
TENCENT_SMS_SIGN_NAME=甄好算
TENCENT_SMS_LOGIN_TEMPLATE_ID=
TENCENT_SMS_BIND_TEMPLATE_ID=
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
MEDUSA_HEALTH_URL=
```

## 部署顺序

```bash
git pull
npm install
npm run db:migrate
npm run graph:seed
npm run test:miniprogram
npm run build
pm2 restart destiny-api --update-env
nginx -t
systemctl reload nginx
```

## MedusaJS 服务

线上 Medusa 后端部署在：

```text
/var/www/zhensuan-medusa/apps/backend
```

环境文件：

```text
/etc/zhensuan/medusa.env
```

PM2 服务：

```bash
pm2 status zhensuan-medusa
curl http://127.0.0.1:9000/health
```

甄好算主应用通过以下环境变量检查 Medusa：

```env
MEDUSA_HEALTH_URL="http://127.0.0.1:9000/health"
```

## 健康检查

```bash
pm2 status destiny-api
pm2 logs destiny-api --lines 100 --nostream
nginx -t
curl -I https://www.goye.cc
curl https://www.goye.cc/destiny-api/health
```

后台登录后检查：

- `/destiny-api/admin/ops/health`
- `/destiny-api/admin/ops/recent-errors`

生产环境除 `/destiny-api/admin/login` 外，其它 `/destiny-api/admin/*` 接口都需要管理员或编辑 token。

## 报告与权益端到端场景

1. 创建或找到一个客户。
2. 客户创建报告次数包订单。
3. 后台人工标记支付成功。
4. 确认自动发放 3 次报告权益，并在 `app.entitlement_deliveries` 记录发放日志。
5. 从 H5 或小程序生成 1 份报告。
6. 确认 `app.report_runs` 有记录，且 `app.safety_reviews` 有安全审查记录。
7. 确认 `app.entitlement_accounts.report_quota_balance` 减少 1。
8. 再次请求付费报告时，次数不足返回 `402` 和 `INSUFFICIENT_REPORT_QUOTA`。

## 小程序验证

- 微信开发者工具打开 `miniprogram/`。
- 确认 AppID 为 `wxc4ed7c07ce86326c`。
- 首页自动执行微信登录模拟接口。
- 报告生成请求访问 `https://www.goye.cc/destiny-api/generate`。
- 商城页面访问 `https://www.goye.cc/destiny-api/customer/products`，可创建报告次数包订单。
- 收货地址页面访问客户地址接口，实物商品下单时使用默认或第一条地址。
- 订单页面访问客户订单接口，并可提交退款申请。
- 罗盘页面调用 `wx.startCompass`、`wx.onCompassChange` 和 `wx.stopCompass`。
- 罗盘可显示方位角、方向文字，并记录房屋朝向。
- 本地可执行 `npm run test:miniprogram` 检查原生页面文件、AppID、正式 API 域名、JS 语法、JSON 配置、罗盘 API 和商城页面。
- 当前本机已开启微信开发者工具服务端口，CLI `islogin`、`preview` 和 `upload` 均已验证通过；开发版本 `0.1.0` 已上传到微信后台。

## 回滚和备份

- 代码回滚走 Git：切回上一个稳定 commit 后重新 `npm install && npm run build`，再重启服务。
- 数据库迁移只做前向修复迁移，不直接回滚已执行 SQL。
- PostgreSQL 每日备份，保留最近 7 天和每周归档。
- Neo4j 定期 dump，至少在本体结构大调整前手动备份一次。
- `/etc/zhensuan/knowledge.env` 等环境文件单独备份，不提交到 Git。

## 第一版外部接口边界

- 腾讯云短信：已设计签名和模板字段，第一版使用模拟发送。
- 微信支付：已保留占位 provider，第一版后台人工标记支付成功。
- 快递接口：第一版不接真实接口，后台人工填写快递公司和单号。
- 退款接口：第一版记录人工审核和处理结果，不调用真实支付退款。

## 微信支付 JSAPI 接入开关

代码已支持小程序微信支付 JSAPI 通道。默认不开启，避免未配置商户资料时影响已上线版本。

服务器环境变量：

```text
WECHAT_PAY_ENABLED=false
WECHAT_PAY_MCH_ID=微信支付商户号
WECHAT_PAY_API_V3_KEY=商户平台设置的 32 位 API v3 密钥
WECHAT_PAY_CERT_SERIAL_NO=商户 API 证书序列号
WECHAT_PAY_PRIVATE_KEY_PATH=/root/certs/wechatpay/apiclient_key.pem
WECHAT_PAY_NOTIFY_URL=https://www.goye.cc/destiny-api/payments/wechat/notify
```

证书文件建议路径：

```text
/root/certs/wechatpay/apiclient_key.pem
```

目录权限建议：

```bash
mkdir -p /root/certs/wechatpay
chmod 700 /root/certs/wechatpay
chmod 600 /root/certs/wechatpay/apiclient_key.pem
```

打开真实支付前检查：

1. 微信支付商户号已经开通 JSAPI/小程序支付。
2. 小程序 AppID 已经绑定该商户号。
3. 商户平台已设置 API v3 密钥。
4. 服务器已放置 `apiclient_key.pem`。
5. 已把 `WECHAT_PAY_ENABLED=true` 写入服务器环境配置。
6. 重启 `destiny-api` 后，在小程序商城创建订单能拉起 `wx.requestPayment`。

支付回调地址：

```text
https://www.goye.cc/destiny-api/payments/wechat/notify
```

说明：

- 支付成功回调会验签、解密，并调用现有支付成功流程。
- 虚拟商品支付成功后自动发放权益。
- 实物商品支付成功后进入待发货。
- 微信退款接口仍未开启，退款继续走后台人工审核。
