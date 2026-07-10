# WeChat JSAPI Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real WeChat JSAPI payment support for the native mini program while keeping manual payment as the safe fallback until merchant credentials are configured.

**Architecture:** The existing order, payment intent, inventory, entitlement and refund services stay as the business source of truth. A new WeChat JSAPI provider creates prepay orders with WeChat Pay API v3, returns `wx.requestPayment` parameters to the mini program, and handles payment notifications by reusing the existing `markPaymentPaid` delivery flow.

**Tech Stack:** Node.js, Express, PostgreSQL, WeChat Pay API v3, WeChat native mini program `wx.requestPayment`, Node `crypto` and `fetch`.

---

### Task 1: Configuration and Provider Boundary

**Files:**
- Modify: `server/config.mjs`
- Create: `server/commerce/payment-providers/wechat-jsapi-provider.mjs`
- Test: `server/tests/wechat-pay-provider.test.mjs`

- [ ] Add config keys for `WECHAT_PAY_ENABLED`, `WECHAT_PAY_MCH_ID`, `WECHAT_PAY_API_V3_KEY`, `WECHAT_PAY_CERT_SERIAL_NO`, `WECHAT_PAY_PRIVATE_KEY_PATH`, `WECHAT_PAY_NOTIFY_URL`.
- [ ] Implement provider helpers for merchant RSA signing, API v3 authorization headers, AES-256-GCM resource decryption, JSAPI prepay calls, and mini program pay parameter signing.
- [ ] Test signing and decryption with deterministic keys and payloads.

### Task 2: Order Creation Uses WeChat Provider When Enabled

**Files:**
- Modify: `server/commerce/order-service.mjs`
- Modify: `server/routes/commerce-routes.mjs`
- Test: `server/tests/commerce.test.mjs`

- [ ] Extend `createPaymentIntent` to accept provider payload from caller while preserving `manual` and `wechat_placeholder`.
- [ ] Add `createWechatPaymentForOrder` service path in the route after order creation.
- [ ] If `provider=wechat_jsapi` but `WECHAT_PAY_ENABLED=false`, return a stable `WECHAT_PAY_DISABLED` response instead of creating a broken payment.
- [ ] If enabled, require the logged-in customer's WeChat `openid`, call JSAPI prepay, persist provider payload, and return `paymentParams` to the mini program.

### Task 3: WeChat Payment Notification

**Files:**
- Modify: `server/routes/commerce-routes.mjs`
- Modify: `server/commerce/order-service.mjs`
- Test: `server/tests/commerce.test.mjs`

- [ ] Add `POST /destiny-api/payments/wechat/notify` as a public endpoint.
- [ ] Parse notification resource, decrypt with API v3 key, locate payment intent by `out_trade_no`, and call `markPaymentPaid`.
- [ ] Make notification handling idempotent: already-paid payments return WeChat success response.
- [ ] Persist notification metadata in `provider_payload` for later audit.

### Task 4: Mini Program Payment Flow

**Files:**
- Modify: `miniprogram/utils/api.js`
- Modify: `miniprogram/pages/store/index.js`
- Modify: `miniprogram/pages/store/index.wxml`
- Test: `scripts/validate-miniprogram.mjs`

- [ ] Change store purchase flow to request `provider: 'wechat_jsapi'`.
- [ ] When backend returns `paymentParams`, call `wx.requestPayment(paymentParams)`.
- [ ] On success, navigate to orders page and let the order list show paid/fulfillment state after backend notification.
- [ ] On `WECHAT_PAY_DISABLED`, fall back to existing manual order behavior with a clear non-production toast.

### Task 5: Verification and Release Notes

**Files:**
- Modify: `docs/miniprogram-release.md`
- Modify: `docs/deployment/zhensuan-online-runbook.md`

- [ ] Document required merchant platform setup and server environment variables.
- [ ] Run `npm run test:server`, `npm run test:miniprogram`, `npm run test:py`, `npm run lint`, and `npm run build`.
- [ ] Upload a new mini program development version only after local validation passes.

### Scope Boundary

- Real WeChat payment is implemented behind `WECHAT_PAY_ENABLED`.
- Real WeChat refund remains a follow-up. Refund requests continue through the existing manual review flow.
- WeChat merchant platform operations, API v3 key setup, certificate download, and final mini program submission/publish still require the account owner to complete in the official console.
