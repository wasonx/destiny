import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import {
  buildMiniProgramPaymentParams,
  buildWechatPayRequestAuthorization,
  decryptWechatPayResource,
  getWechatPayConfigState,
  signWechatPayMessage,
} from '../commerce/payment-providers/wechat-jsapi-provider.mjs';
import { loadConfig } from '../config.mjs';

function createTestKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function verifySignature({ publicKey, message, signature }) {
  return crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
}

function encryptWechatResource({ plaintext, apiV3Key, nonce, associatedData }) {
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'));
  if (associatedData) cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return encrypted.toString('base64');
}

test('wechat pay config reports missing merchant settings without leaking values', () => {
  const config = loadConfig({
    WECHAT_PAY_ENABLED: 'true',
    WECHAT_MINIPROGRAM_APP_ID: 'wx-app',
  });
  const state = getWechatPayConfigState(config);

  assert.equal(state.enabled, true);
  assert.equal(state.configured, false);
  assert.deepEqual(state.missing.sort(), [
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_CERT_SERIAL_NO',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_PRIVATE_KEY_PATH',
  ].sort());
});

test('wechat pay request authorization signs the canonical API v3 message', () => {
  const { publicKey, privateKey } = createTestKeyPair();
  const config = loadConfig({
    WECHAT_PAY_MCH_ID: '1900000001',
    WECHAT_PAY_API_V3_KEY: '12345678901234567890123456789012',
    WECHAT_PAY_CERT_SERIAL_NO: 'CERTSERIAL',
    WECHAT_PAY_PRIVATE_KEY_PATH: 'unused.pem',
    WECHAT_PAY_ENABLED: 'true',
    WECHAT_MINIPROGRAM_APP_ID: 'wx-app',
  });
  const body = JSON.stringify({ appid: 'wx-app', mchid: '1900000001' });
  const result = buildWechatPayRequestAuthorization({
    config,
    method: 'POST',
    canonicalUrl: '/v3/pay/transactions/jsapi',
    body,
    nonceStr: 'nonce-1',
    timestamp: '1720000000',
    privateKey,
  });

  assert.match(result.authorization, /WECHATPAY2-SHA256-RSA2048/);
  assert.match(result.authorization, /mchid="1900000001"/);
  assert.equal(verifySignature({ publicKey, message: result.message, signature: result.signature }), true);
});

test('mini program payment params are signed for wx.requestPayment', () => {
  const { publicKey, privateKey } = createTestKeyPair();
  const params = buildMiniProgramPaymentParams({
    appId: 'wx-app',
    prepayId: 'wx-prepay-id',
    privateKey,
    nonceStr: 'nonce-2',
    timeStamp: '1720000001',
  });
  const message = `wx-app\n1720000001\nnonce-2\nprepay_id=wx-prepay-id\n`;

  assert.deepEqual(Object.keys(params).sort(), ['nonceStr', 'package', 'paySign', 'signType', 'timeStamp'].sort());
  assert.equal(params.signType, 'RSA');
  assert.equal(params.package, 'prepay_id=wx-prepay-id');
  assert.equal(verifySignature({ publicKey, message, signature: params.paySign }), true);
});

test('wechat notification resource decrypts AES-256-GCM JSON payload', () => {
  const apiV3Key = '12345678901234567890123456789012';
  const nonce = 'nonce12345678';
  const associatedData = 'transaction';
  const plaintext = JSON.stringify({
    out_trade_no: 'ZS123',
    trade_state: 'SUCCESS',
    amount: { total: 990 },
  });
  const resource = {
    nonce,
    associated_data: associatedData,
    ciphertext: encryptWechatResource({ plaintext, apiV3Key, nonce, associatedData }),
  };

  assert.deepEqual(decryptWechatPayResource(resource, apiV3Key), {
    out_trade_no: 'ZS123',
    trade_state: 'SUCCESS',
    amount: { total: 990 },
  });
});

test('wechat notification resource can decrypt non-json platform certificate text', () => {
  const apiV3Key = '12345678901234567890123456789012';
  const nonce = 'certnonce123';
  const associatedData = 'certificate';
  const plaintext = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
  const resource = {
    nonce,
    associated_data: associatedData,
    ciphertext: encryptWechatResource({ plaintext, apiV3Key, nonce, associatedData }),
  };

  assert.equal(decryptWechatPayResource(resource, apiV3Key, { parseJson: false }), plaintext);
});

test('wechat pay message signing is verifiable with the matching public key', () => {
  const { publicKey, privateKey } = createTestKeyPair();
  const message = 'GET\n/v3/certificates\n1720000002\nnonce-3\n\n';
  const signature = signWechatPayMessage(message, privateKey);

  assert.equal(verifySignature({ publicKey, message, signature }), true);
});
