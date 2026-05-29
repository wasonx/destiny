import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWechatSessionProvider, WechatSessionError } from '../auth/wechat-session-provider.mjs';
import { loadConfig } from '../config.mjs';

test('wechat provider exchanges code with configured code2session endpoint', async () => {
  let requestedUrl = '';
  const fetchImpl = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return {
          openid: 'openid-1',
          unionid: 'unionid-1',
          session_key: 'do-not-store-or-return',
        };
      },
    };
  };
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_MINIPROGRAM_SECRET: 'app-secret',
    WECHAT_CODE2SESSION_URL: 'https://api.weixin.qq.com/sns/jscode2session',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl });

  const session = await provider.exchange('code-123');
  const url = new URL(requestedUrl);

  assert.equal(url.origin + url.pathname, 'https://api.weixin.qq.com/sns/jscode2session');
  assert.equal(url.searchParams.get('appid'), 'app-id');
  assert.equal(url.searchParams.get('secret'), 'app-secret');
  assert.equal(url.searchParams.get('js_code'), 'code-123');
  assert.equal(url.searchParams.get('grant_type'), 'authorization_code');
  assert.deepEqual(session, {
    openid: 'openid-1',
    unionid: 'unionid-1',
    providerPayload: {
      endpoint: 'https://api.weixin.qq.com/sns/jscode2session',
      hasUnionid: true,
      mode: 'real',
    },
  });
});

test('wechat provider rejects missing app secret when mock mode is disabled', async () => {
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_LOGIN_MOCKS_ENABLED: 'false',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl: async () => assert.fail('fetch should not be called') });

  await assert.rejects(
    provider.exchange('code-123'),
    (error) => error instanceof WechatSessionError && error.code === 'WECHAT_LOGIN_NOT_CONFIGURED',
  );
});

test('wechat provider supports explicit local mock mode', async () => {
  const config = loadConfig({
    WECHAT_LOGIN_MOCKS_ENABLED: 'true',
  });
  const provider = createWechatSessionProvider({ config, fetchImpl: async () => assert.fail('fetch should not be called') });

  assert.deepEqual(await provider.exchange('code-123'), {
    openid: 'mock-openid-code-123',
    unionid: null,
    providerPayload: {
      mode: 'mock',
    },
  });
});

test('wechat provider maps WeChat API errors to typed error', async () => {
  const config = loadConfig({
    WECHAT_MINIPROGRAM_APP_ID: 'app-id',
    WECHAT_MINIPROGRAM_SECRET: 'app-secret',
  });
  const provider = createWechatSessionProvider({
    config,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { errcode: 40029, errmsg: 'invalid code' };
      },
    }),
  });

  await assert.rejects(
    provider.exchange('bad-code'),
    (error) => error instanceof WechatSessionError && error.code === 'WECHAT_CODE_SESSION_FAILED' && error.wechatCode === 40029,
  );
});
