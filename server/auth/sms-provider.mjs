import { randomInt } from 'node:crypto';

/**
 * Cryptographically-random numeric OTP code (default 6 digits).
 * Replaces the previous hardcoded universal code.
 */
export function generateOtpCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

/**
 * True only when every Tencent Cloud SMS credential required for real sending
 * is present. When false, the OTP routes fall back to dev/mock mode (gated by
 * customerAuthMocksEnabled) or return 503 SMS_NOT_CONFIGURED.
 */
export function isRealSmsProvider(config) {
  return Boolean(
    config.tencentSmsSdkAppId &&
    config.tencentSmsSecretId &&
    config.tencentSmsSecretKey &&
    config.tencentSmsSignName &&
    config.tencentSmsLoginTemplateId,
  );
}

let cachedClient = null;
let cachedClientKey = '';

async function getTencentClient(config) {
  const key = `${config.tencentSmsSdkAppId}|${config.tencentSmsSecretId}`;
  if (cachedClient && cachedClientKey === key) {
    return cachedClient;
  }
  // Dynamic import so the (large) SDK is only loaded when real sending is used.
  // This also means the SDK does not need to be installed for dev/mock mode.
  const mod = await import('tencentcloud-sdk-nodejs-sms');
  const sms = mod.sms || (mod.default && mod.default.sms);
  if (!sms || !sms.v20210111) {
    throw new Error('TENCENT_SMS_SDK_UNAVAILABLE');
  }
  cachedClient = new sms.v20210111.Client({
    credential: {
      secretId: config.tencentSmsSecretId,
      secretKey: config.tencentSmsSecretKey,
    },
    region: 'ap-guangzhou',
    profile: {
      httpProfile: { endpoint: 'sms.tencentcloudapi.com' },
    },
  });
  cachedClientKey = key;
  return cachedClient;
}

/**
 * Send a login OTP via Tencent Cloud SMS. Throws on any failure with
 * `meta.code` set to the Tencent SendStatus code for diagnostics.
 *
 * The login template is expected to contain exactly one placeholder {1} that
 * receives the code (e.g. "您的验证码为{1}，5分钟内有效…"). If your approved
 * template uses a second placeholder for the expiry minutes, extend
 * TemplateParamSet below.
 */
export async function sendLoginOtp({ phone, code, config }) {
  if (!isRealSmsProvider(config)) {
    throw new Error('SMS_REAL_PROVIDER_NOT_CONFIGURED');
  }
  const client = await getTencentClient(config);
  const params = {
    PhoneNumberSet: [`+86${String(phone).replace(/\D/g, '')}`],
    SmsSdkAppId: config.tencentSmsSdkAppId,
    SignName: config.tencentSmsSignName,
    TemplateId: config.tencentSmsLoginTemplateId,
    TemplateParamSet: [code],
  };
  const resp = await client.SendSms(params);
  const status = resp && resp.SendStatusSet && resp.SendStatusSet[0];
  if (!status || status.Code !== 'Ok') {
    const err = new Error('SMS_SEND_FAILED');
    err.meta = {
      code: status ? status.Code : 'NO_STATUS',
      message: status ? status.Message : 'Tencent returned no SendStatus',
    };
    throw err;
  }
  return { provider: 'tencent', messageId: status.SerialNo || null };
}
