function requirePlatformAdmin(req, res, pool) {
  if (!pool || req.session?.account_type === 'admin') {
    return true;
  }
  res.status(403).json({ error: 'ADMIN_ONLY' });
  return false;
}

function buildIntegrationStatus(config) {
  const wechatConfigured = Boolean(config.wechatMiniProgramAppId && config.wechatMiniProgramSecret);
  return {
    integrations: {
      wechatLogin: {
        name: '微信登录',
        provider: 'wechat-code2session',
        realProviderEnabled: wechatConfigured && !config.wechatLoginMocksEnabled,
        mockMode: Boolean(config.wechatLoginMocksEnabled),
        appIdConfigured: Boolean(config.wechatMiniProgramAppId),
        note: wechatConfigured ? '小程序登录已配置真实 code2session 边界' : '缺少小程序 AppID 或 Secret',
      },
      sms: {
        name: '短信',
        provider: 'mock',
        realProviderEnabled: false,
        signName: config.tencentSmsSignName || '甄算',
        loginTemplateConfigured: Boolean(config.tencentSmsLoginTemplateId),
        bindTemplateConfigured: Boolean(config.tencentSmsBindTemplateId),
        note: '手机号验证码为模拟发送，腾讯云短信真实接口未接入',
      },
      payment: {
        name: '支付',
        provider: 'manual',
        realProviderEnabled: false,
        note: '微信支付真实接口未接入，订单支付由后台人工确认',
      },
      refund: {
        name: '退款',
        provider: 'manual',
        realProviderEnabled: false,
        note: '真实微信退款未接入，退款申请由后台人工处理',
      },
      courier: {
        name: '快递',
        provider: 'manual',
        realProviderEnabled: false,
        note: '真实快递接口未接入，快递公司和单号由后台手工录入',
      },
    },
  };
}

export function mountSettingsRoutes(app, { config, pool = null } = {}) {
  app.get('/destiny-api/admin/settings/integrations', (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    res.json(buildIntegrationStatus(config));
  });

  app.get('/destiny-api/admin/sms-delivery-logs', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      res.json({ smsLogs: [] });
      return;
    }

    const phone = String(req.query.phone || '').trim() || null;
    const status = String(req.query.status || '').trim() || null;
    const provider = String(req.query.provider || '').trim() || null;
    const result = await pool.query(
      `
        select
          id,
          challenge_id,
          phone,
          purpose,
          provider,
          status,
          template_id,
          sign_name,
          provider_payload,
          created_at
        from app.sms_delivery_logs
        where ($1::text is null or phone = $1)
          and ($2::text is null or status = $2)
          and ($3::text is null or provider = $3)
        order by created_at desc
        limit 200
      `,
      [phone, status, provider],
    );
    res.json({ smsLogs: result.rows });
  });
}
