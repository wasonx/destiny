export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3201),
    apiKey: env.DEEPSEEK_API_KEY || '',
    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
    endpoint: env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
    databaseUrl: env.DATABASE_URL || '',
    sessionSecret: env.SESSION_SECRET || 'dev-only-session-secret',
    customerAuthMocksEnabled: env.CUSTOMER_AUTH_MOCKS_ENABLED !== 'false',
    smsCodeTtlSeconds: Number(env.SMS_CODE_TTL_SECONDS || 300),
    smsSendCooldownSeconds: Number(env.SMS_SEND_COOLDOWN_SECONDS || 60),
    smsOtpMaxAttempts: Number(env.SMS_OTP_MAX_ATTEMPTS || 5),
    qrLoginTtlSeconds: Number(env.QR_LOGIN_TTL_SECONDS || 180),
    wechatMiniProgramAppId: env.WECHAT_MINIPROGRAM_APP_ID || '',
    wechatMiniProgramSecret: env.WECHAT_MINIPROGRAM_SECRET || '',
    wechatCode2SessionUrl: env.WECHAT_CODE2SESSION_URL || 'https://api.weixin.qq.com/sns/jscode2session',
    wechatLoginMocksEnabled: env.WECHAT_LOGIN_MOCKS_ENABLED === 'true',
    wechatPayEnabled: env.WECHAT_PAY_ENABLED === 'true',
    wechatPayMchId: env.WECHAT_PAY_MCH_ID || '',
    wechatPayApiV3Key: env.WECHAT_PAY_API_V3_KEY || '',
    wechatPayCertSerialNo: env.WECHAT_PAY_CERT_SERIAL_NO || '',
    wechatPayPrivateKeyPath: env.WECHAT_PAY_PRIVATE_KEY_PATH || '',
    wechatPayNotifyUrl: env.WECHAT_PAY_NOTIFY_URL || 'https://www.goye.cc/destiny-api/payments/wechat/notify',
    wechatPayApiBaseUrl: env.WECHAT_PAY_API_BASE_URL || 'https://api.mch.weixin.qq.com',
    tencentSmsSdkAppId: env.TENCENT_SMS_SDK_APP_ID || '',
    tencentSmsSecretId: env.TENCENT_SMS_SECRET_ID || '',
    tencentSmsSecretKey: env.TENCENT_SMS_SECRET_KEY || '',
    tencentSmsSignName: env.TENCENT_SMS_SIGN_NAME || '甄好算',
    tencentSmsLoginTemplateId: env.TENCENT_SMS_LOGIN_TEMPLATE_ID || '',
    tencentSmsBindTemplateId: env.TENCENT_SMS_BIND_TEMPLATE_ID || '',
    smsRealProviderEnabled: Boolean(
      (env.TENCENT_SMS_SDK_APP_ID || '') &&
      (env.TENCENT_SMS_SECRET_ID || '') &&
      (env.TENCENT_SMS_SECRET_KEY || '') &&
      (env.TENCENT_SMS_LOGIN_TEMPLATE_ID || '') &&
      (env.TENCENT_SMS_SIGN_NAME || ''),
    ),
    neo4jUri: env.NEO4J_URI || 'bolt://127.0.0.1:7687',
    neo4jUsername: env.NEO4J_USERNAME || 'neo4j',
    neo4jPassword: env.NEO4J_PASSWORD || '',
    neo4jDatabase: env.NEO4J_DATABASE || 'neo4j',
    medusaHealthUrl: env.MEDUSA_HEALTH_URL || '',
  };
}
