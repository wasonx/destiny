import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const platformCertificateCache = new Map();

export class WechatPayError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'WechatPayError';
    this.code = code;
    Object.assign(this, meta);
  }
}

function requiredConfigEntries(config) {
  return [
    ['WECHAT_MINIPROGRAM_APP_ID', config?.wechatMiniProgramAppId],
    ['WECHAT_PAY_MCH_ID', config?.wechatPayMchId],
    ['WECHAT_PAY_API_V3_KEY', config?.wechatPayApiV3Key],
    ['WECHAT_PAY_CERT_SERIAL_NO', config?.wechatPayCertSerialNo],
    ['WECHAT_PAY_PRIVATE_KEY_PATH', config?.wechatPayPrivateKeyPath],
    ['WECHAT_PAY_NOTIFY_URL', config?.wechatPayNotifyUrl],
  ];
}

export function getWechatPayConfigState(config) {
  const missing = requiredConfigEntries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  return {
    enabled: Boolean(config?.wechatPayEnabled),
    configured: missing.length === 0,
    missing,
  };
}

export function assertWechatPayReady(config) {
  const state = getWechatPayConfigState(config);
  if (!state.enabled) {
    throw new WechatPayError('WECHAT_PAY_DISABLED', 'WeChat Pay is disabled');
  }
  if (!state.configured) {
    throw new WechatPayError('WECHAT_PAY_NOT_CONFIGURED', 'WeChat Pay configuration is incomplete', { missing: state.missing });
  }
  if (String(config.wechatPayApiV3Key).length !== 32) {
    throw new WechatPayError('WECHAT_PAY_API_V3_KEY_INVALID', 'WeChat Pay API v3 key must be 32 bytes');
  }
}

export function readWechatPayPrivateKey(config) {
  assertWechatPayReady(config);
  try {
    return readFileSync(config.wechatPayPrivateKeyPath, 'utf8');
  } catch (error) {
    throw new WechatPayError('WECHAT_PAY_PRIVATE_KEY_UNREADABLE', 'WeChat Pay private key cannot be read', { cause: error });
  }
}

export function createNonceStr(size = 16) {
  return crypto.randomBytes(size).toString('hex');
}

export function signWechatPayMessage(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
}

export function buildWechatPayRequestAuthorization({
  config,
  method,
  canonicalUrl,
  body = '',
  nonceStr = createNonceStr(),
  timestamp = Math.floor(Date.now() / 1000).toString(),
  privateKey = readWechatPayPrivateKey(config),
}) {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  const message = `${method.toUpperCase()}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;
  const signature = signWechatPayMessage(message, privateKey);
  return {
    authorization: 'WECHATPAY2-SHA256-RSA2048 ' + [
      `mchid="${config.wechatPayMchId}"`,
      `nonce_str="${nonceStr}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${config.wechatPayCertSerialNo}"`,
    ].join(','),
    timestamp,
    nonceStr,
    signature,
    message,
  };
}

async function requestWechatPayJson({
  config,
  method,
  canonicalUrl,
  body = null,
  fetchImpl = fetch,
}) {
  assertWechatPayReady(config);
  const bodyText = body ? JSON.stringify(body) : '';
  const { authorization } = buildWechatPayRequestAuthorization({
    config,
    method,
    canonicalUrl,
    body: bodyText,
  });
  const response = await fetchImpl(`${config.wechatPayApiBaseUrl}${canonicalUrl}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: authorization,
      'Content-Type': 'application/json',
      'User-Agent': 'zhensuan-wechat-pay/1.0',
      'Accept-Language': 'zh-CN',
    },
    body: bodyText || undefined,
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  if (!response.ok) {
    throw new WechatPayError('WECHAT_PAY_API_FAILED', 'WeChat Pay API request failed', {
      status: response.status,
      payload,
    });
  }
  return payload;
}

export function buildMiniProgramPaymentParams({
  appId,
  prepayId,
  privateKey,
  nonceStr = createNonceStr(),
  timeStamp = Math.floor(Date.now() / 1000).toString(),
}) {
  const packageValue = `prepay_id=${prepayId}`;
  const message = `${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: signWechatPayMessage(message, privateKey),
  };
}

export async function createWechatJsapiPaymentIntent({
  config,
  order,
  amountCents,
  openid,
  description = 'Zhensuan order',
  fetchImpl = fetch,
}) {
  assertWechatPayReady(config);
  if (!openid) {
    throw new WechatPayError('WECHAT_PAY_OPENID_REQUIRED', 'WeChat Pay requires customer openid');
  }
  const outTradeNo = order.order_no;
  const requestBody = {
    appid: config.wechatMiniProgramAppId,
    mchid: config.wechatPayMchId,
    description: String(description || 'Zhensuan order').slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: config.wechatPayNotifyUrl,
    amount: {
      total: Number(amountCents),
      currency: 'CNY',
    },
    payer: {
      openid,
    },
  };
  const response = await requestWechatPayJson({
    config,
    method: 'POST',
    canonicalUrl: '/v3/pay/transactions/jsapi',
    body: requestBody,
    fetchImpl,
  });
  if (!response.prepay_id) {
    throw new WechatPayError('WECHAT_PAY_PREPAY_ID_MISSING', 'WeChat Pay did not return prepay_id', { payload: response });
  }
  const privateKey = readWechatPayPrivateKey(config);
  const paymentParams = buildMiniProgramPaymentParams({
    appId: config.wechatMiniProgramAppId,
    prepayId: response.prepay_id,
    privateKey,
  });
  return {
    provider: 'wechat_jsapi',
    status: 'pending',
    providerPayload: {
      outTradeNo,
      prepayId: response.prepay_id,
      notifyUrl: config.wechatPayNotifyUrl,
      amountCents: Number(amountCents),
      paymentParams,
    },
  };
}

export function decryptWechatPayResource(resource, apiV3Key, { parseJson = true } = {}) {
  if (!resource?.ciphertext || !resource?.nonce) {
    throw new WechatPayError('WECHAT_PAY_RESOURCE_INVALID', 'WeChat Pay notification resource is invalid');
  }
  const key = Buffer.from(apiV3Key || '', 'utf8');
  if (key.length !== 32) {
    throw new WechatPayError('WECHAT_PAY_API_V3_KEY_INVALID', 'WeChat Pay API v3 key must be 32 bytes');
  }
  const encrypted = Buffer.from(resource.ciphertext, 'base64');
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
  }
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return parseJson ? JSON.parse(plaintext) : plaintext;
}

function normalizeCertificateSerial(serial) {
  return String(serial || '').replace(/:/g, '').toUpperCase();
}

async function fetchWechatPlatformCertificate({ config, serialNo, fetchImpl = fetch }) {
  const cacheKey = `${config.wechatPayMchId}:${normalizeCertificateSerial(serialNo)}`;
  const cached = platformCertificateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.publicKey;

  const payload = await requestWechatPayJson({
    config,
    method: 'GET',
    canonicalUrl: '/v3/certificates',
    fetchImpl,
  });
  const certificate = (payload.data || []).find((item) => normalizeCertificateSerial(item.serial_no) === normalizeCertificateSerial(serialNo));
  if (!certificate) {
    throw new WechatPayError('WECHAT_PAY_PLATFORM_CERT_NOT_FOUND', 'WeChat Pay platform certificate was not found', { serialNo });
  }
  const pem = decryptWechatPayResource(certificate.encrypt_certificate, config.wechatPayApiV3Key, { parseJson: false });
  const x509 = new crypto.X509Certificate(pem);
  const publicKey = x509.publicKey;
  const expireTime = certificate.expire_time ? Date.parse(certificate.expire_time) : Date.now() + 60 * 60 * 1000;
  platformCertificateCache.set(cacheKey, {
    publicKey,
    expiresAt: Math.min(expireTime, Date.now() + 12 * 60 * 60 * 1000),
  });
  return publicKey;
}

function getHeader(headers, name) {
  const lower = name.toLowerCase();
  return headers?.[lower] || headers?.[name] || '';
}

export async function verifyWechatPayNotificationSignature({
  config,
  headers,
  rawBody,
  fetchImpl = fetch,
}) {
  assertWechatPayReady(config);
  const timestamp = getHeader(headers, 'wechatpay-timestamp');
  const nonce = getHeader(headers, 'wechatpay-nonce');
  const signature = getHeader(headers, 'wechatpay-signature');
  const serial = getHeader(headers, 'wechatpay-serial');
  if (!timestamp || !nonce || !signature || !serial) {
    throw new WechatPayError('WECHAT_PAY_SIGNATURE_HEADERS_MISSING', 'WeChat Pay notification signature headers are missing');
  }
  const publicKey = await fetchWechatPlatformCertificate({ config, serialNo: serial, fetchImpl });
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const ok = crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
  if (!ok) {
    throw new WechatPayError('WECHAT_PAY_SIGNATURE_INVALID', 'WeChat Pay notification signature is invalid');
  }
  return true;
}

export async function parseWechatPayNotification({
  config,
  headers,
  rawBody,
  fetchImpl = fetch,
}) {
  await verifyWechatPayNotificationSignature({ config, headers, rawBody, fetchImpl });
  let notification;
  try {
    notification = JSON.parse(rawBody);
  } catch (error) {
    throw new WechatPayError('WECHAT_PAY_NOTIFICATION_INVALID_JSON', 'WeChat Pay notification body is not valid JSON', { cause: error });
  }
  const transaction = decryptWechatPayResource(notification.resource, config.wechatPayApiV3Key);
  return {
    notification,
    transaction,
  };
}
