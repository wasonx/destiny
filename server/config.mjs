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
    qrLoginTtlSeconds: Number(env.QR_LOGIN_TTL_SECONDS || 180),
    tencentSmsSdkAppId: env.TENCENT_SMS_SDK_APP_ID || '',
    tencentSmsSignName: env.TENCENT_SMS_SIGN_NAME || '甄算',
    tencentSmsLoginTemplateId: env.TENCENT_SMS_LOGIN_TEMPLATE_ID || '',
    tencentSmsBindTemplateId: env.TENCENT_SMS_BIND_TEMPLATE_ID || '',
    neo4jUri: env.NEO4J_URI || 'bolt://127.0.0.1:7687',
    neo4jUsername: env.NEO4J_USERNAME || 'neo4j',
    neo4jPassword: env.NEO4J_PASSWORD || '',
    neo4jDatabase: env.NEO4J_DATABASE || 'neo4j',
    medusaHealthUrl: env.MEDUSA_HEALTH_URL || '',
  };
}
