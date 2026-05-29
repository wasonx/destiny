# 甄算线上运行手册

## 服务组成

- Node/Express API：提供报告生成、账号登录、知识库后台、权益、商城和运维接口。
- Vite 静态前端：提供 H5 和 `/admin` 后台入口。
- PostgreSQL：保存账号、知识库、规则、报告、会员积分、订单、支付、退款和审计数据。
- Neo4j：保存八字本体图谱和概念关系。
- MedusaJS：作为未来商品底座边界，第一版本地轻商城已保留映射字段。
- Nginx：负责 HTTPS、静态文件和 `/destiny-api` 反向代理。
- systemd：负责 Node API 常驻运行和重启。

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
TENCENT_SMS_SIGN_NAME=甄算
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
npm run build
pm2 restart destiny-api --update-env
nginx -t
systemctl reload nginx
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

## 报告与权益端到端场景

1. 创建或找到一个客户。
2. 给客户发放 1 次报告次数。
3. 从 H5 或小程序生成 1 份报告。
4. 确认 `app.report_runs` 有记录。
5. 确认 `app.entitlement_accounts.report_quota_balance` 减少 1。
6. 再次请求付费报告时，次数不足返回 `402` 和 `INSUFFICIENT_REPORT_QUOTA`。

## 小程序验证

- 微信开发者工具打开 `miniprogram/`。
- 确认 AppID 为 `wxc4ed7c07ce86326c`。
- 首页自动执行微信登录模拟接口。
- 报告生成请求访问 `https://www.goye.cc/destiny-api/generate`。
- 罗盘页面调用 `wx.startCompass`、`wx.onCompassChange` 和 `wx.stopCompass`。
- 罗盘可显示方位角、方向文字，并记录房屋朝向。

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
