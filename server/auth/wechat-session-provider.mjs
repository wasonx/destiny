export class WechatSessionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WechatSessionError';
    this.code = code;
    Object.assign(this, details);
  }
}

function sanitizeCode(code) {
  return String(code || '').trim();
}

function sanitizePayload(payload, endpoint, mode) {
  return {
    endpoint,
    hasUnionid: Boolean(payload.unionid),
    mode,
  };
}

export function createWechatSessionProvider({ config, fetchImpl = fetch } = {}) {
  const endpoint = config?.wechatCode2SessionUrl || 'https://api.weixin.qq.com/sns/jscode2session';

  return {
    async exchange(rawCode) {
      const code = sanitizeCode(rawCode);
      if (!code) {
        throw new WechatSessionError('WECHAT_CODE_REQUIRED', 'WeChat login code is required');
      }

      if (config?.wechatLoginMocksEnabled) {
        return {
          openid: `mock-openid-${code}`,
          unionid: null,
          providerPayload: { mode: 'mock' },
        };
      }

      if (!config?.wechatMiniProgramAppId || !config?.wechatMiniProgramSecret) {
        throw new WechatSessionError('WECHAT_LOGIN_NOT_CONFIGURED', 'WeChat mini-program app id or secret is not configured');
      }

      const url = new URL(endpoint);
      url.searchParams.set('appid', config.wechatMiniProgramAppId);
      url.searchParams.set('secret', config.wechatMiniProgramSecret);
      url.searchParams.set('js_code', code);
      url.searchParams.set('grant_type', 'authorization_code');

      let response;
      try {
        response = await fetchImpl(url);
      } catch (error) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session network request failed', { cause: error });
      }

      if (!response.ok) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session HTTP request failed', { status: response.status });
      }

      const rawText = await response.text();
      let payload = {};
      try {
        payload = JSON.parse(rawText);
      } catch {
        // WeChat sometimes returns non-standard JSON like {code:invalid_code_for_verification}
        // Extract errcode/errmsg using regex as a fallback
        const codeMatch = rawText.match(/errcode["\s]*[:=]["\s]*([^,}\s"]+)/i) || rawText.match(/code["\s]*[:=]["\s]*([^,}\s"]+)/i);
        const msgMatch = rawText.match(/errmsg["\s]*[:=]["\s]*["']?([^,"}']+)["']?/i);
        if (codeMatch) {
          payload = { errcode: codeMatch[1], errmsg: msgMatch?.[1] || rawText };
        } else {
          throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session returned unparseable response', { raw: rawText.slice(0, 200) });
        }
      }
      if (payload.errcode) {
        throw new WechatSessionError('WECHAT_CODE_SESSION_FAILED', 'WeChat code2session returned an error', {
          wechatCode: payload.errcode,
          wechatMessage: payload.errmsg || '',
        });
      }

      if (!payload.openid) {
        throw new WechatSessionError('WECHAT_OPENID_MISSING', 'WeChat code2session response did not include openid');
      }

      return {
        openid: payload.openid,
        unionid: payload.unionid || null,
        providerPayload: sanitizePayload(payload, endpoint, 'real'),
      };
    },
  };
}
