import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

test('admin integration settings expose provider status without secrets', async () => {
  let sessionRole = 'editor';
  const pool = {
    async query(sql) {
      const text = normalizeSql(sql);
      if (text.includes('from app.login_sessions')) {
        return { rows: [{ session_id: 'session-1', account_type: sessionRole, user_id: 'admin-1', status: 'active', display_name: '管理员' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const app = createApp({
    config: loadConfig({
      SESSION_SECRET: 'test-secret',
      WECHAT_MINIPROGRAM_APP_ID: 'wx-app',
      WECHAT_MINIPROGRAM_SECRET: 'should-not-leak',
      TENCENT_SMS_SIGN_NAME: '甄算',
      TENCENT_SMS_LOGIN_TEMPLATE_ID: 'login-template',
    }),
    pool,
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const editorResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/settings/integrations`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(editorResponse.status, 403);

    sessionRole = 'admin';
    const adminResponse = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/settings/integrations`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    const data = await adminResponse.json();
    const serialized = JSON.stringify(data);

    assert.equal(adminResponse.status, 200);
    assert.equal(data.integrations.wechatLogin.realProviderEnabled, true);
    assert.equal(data.integrations.sms.provider, 'mock');
    assert.equal(data.integrations.sms.realProviderEnabled, false);
    assert.equal(data.integrations.payment.provider, 'manual');
    assert.equal(data.integrations.payment.realProviderEnabled, false);
    assert.equal(data.integrations.refund.realProviderEnabled, false);
    assert.equal(data.integrations.courier.realProviderEnabled, false);
    assert.ok(!serialized.includes('should-not-leak'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
