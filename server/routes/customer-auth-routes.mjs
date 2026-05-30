import { createHash } from 'node:crypto';
import { createLoginSession, createSessionToken } from '../auth/sessions.mjs';
import { createWechatSessionProvider, WechatSessionError } from '../auth/wechat-session-provider.mjs';
import { findSession } from '../middleware/require-session.mjs';
import { memory, nextId } from './memory-state.mjs';

const mockCode = '246810';

function hashOtp(phone, code) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function buildWechatSubject({ openid, unionid }) {
  return unionid ? `unionid:${unionid}` : `openid:${openid}`;
}

async function findWechatUserId(client, { openid, unionid, subject }) {
  const result = await client.query(
    `
      select user_id
      from app.customer_identities
      where provider = 'wechat'
        and (
          provider_subject = $1
          or ($2::text is not null and unionid = $2)
          or openid = $3
        )
      order by created_at asc
      limit 1
    `,
    [subject, unionid, openid],
  );
  return result.rows[0]?.user_id || null;
}

async function upsertWechatIdentity(client, { userId, openid, unionid, subject, providerPayload }) {
  const updated = await client.query(
    `
      update app.customer_identities
      set provider_subject = $2,
          openid = $3,
          unionid = $4,
          provider_payload = $5,
          updated_at = now()
      where provider = 'wechat'
        and user_id = $1
      returning id
    `,
    [userId, subject, openid, unionid, providerPayload],
  );
  if (updated.rowCount) {
    return;
  }
  await client.query(
    `
      insert into app.customer_identities(user_id, provider, provider_subject, openid, unionid, provider_payload)
      values ($1, 'wechat', $2, $3, $4, $5)
    `,
    [userId, subject, openid, unionid, providerPayload],
  );
}

export function mountCustomerAuthRoutes(app, { config, pool, wechatSessionProvider = null }) {
  const wechatProvider = wechatSessionProvider || createWechatSessionProvider({ config });

  app.post('/destiny-api/customer/login/wechat', async (req, res) => {
    const code = String(req.body?.code || '').trim();
    if (!code) {
      res.status(400).json({ error: 'WECHAT_CODE_REQUIRED' });
      return;
    }

    if (!pool) {
      if (!config.wechatLoginMocksEnabled && !config.customerAuthMocksEnabled) {
        res.status(503).json({ error: 'WECHAT_LOGIN_NOT_CONFIGURED' });
        return;
      }
      const session = await wechatProvider.exchange(code);
      res.json({
        token: memory.customerToken,
        customer: {
          id: 'dev-customer',
          provider: 'wechat',
          openid: session.openid,
          unionid: session.unionid,
        },
      });
      return;
    }

    let wechatSession;
    try {
      wechatSession = await wechatProvider.exchange(code);
    } catch (error) {
      if (error instanceof WechatSessionError) {
        const status = error.code === 'WECHAT_CODE_REQUIRED' ? 400 : 502;
        res.status(status).json({ error: error.code });
        return;
      }
      throw error;
    }

    const subject = buildWechatSubject(wechatSession);
    const client = await pool.connect();
    try {
      await client.query('begin');
      let userId = await findWechatUserId(client, { ...wechatSession, subject });
      if (!userId) {
        const user = await client.query("insert into app.users(account_type, display_name) values ('customer', '微信客户') returning id");
        userId = user.rows[0].id;
      }
      await upsertWechatIdentity(client, {
        userId,
        openid: wechatSession.openid,
        unionid: wechatSession.unionid,
        subject,
        providerPayload: wechatSession.providerPayload,
      });
      const { token } = await createLoginSession(client, { config, userId, accountType: 'customer' });
      await client.query('commit');
      res.json({
        token,
        customer: {
          id: userId,
          provider: 'wechat',
          openid: wechatSession.openid,
          unionid: wechatSession.unionid,
        },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/customer/otp/send', async (req, res) => {
    const phone = req.body?.phone;
    if (!phone) {
      res.status(400).json({ error: 'PHONE_REQUIRED' });
      return;
    }
    if (pool) {
      await pool.query(
        `
          insert into app.sms_otp_challenges(phone, purpose, code_hash, expires_at, provider_payload)
          values ($1, 'login', $2, now() + ($3 || ' seconds')::interval, $4)
        `,
        [
          phone,
          hashOtp(phone, mockCode),
          config.smsCodeTtlSeconds,
          {
            provider: 'mock',
            smsSign: config.tencentSmsSignName,
            loginTemplate: '您的登录验证码为 {code}，5 分钟内有效。如非本人操作，请忽略。',
          },
        ],
      );
    }
    res.json({ ok: true, devCode: mockCode });
  });

  app.post('/destiny-api/customer/otp/verify', async (req, res) => {
    const { phone, code } = req.body || {};
    if (code !== mockCode) {
      res.status(400).json({ error: 'INVALID_CODE' });
      return;
    }
    if (!pool) {
      res.json({ token: memory.customerToken, customer: { id: 'dev-customer', phone } });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const challenge = await client.query(
        `
          update app.sms_otp_challenges
          set consumed_at = now()
          where phone = $1 and code_hash = $2 and consumed_at is null and expires_at > now()
          returning id
        `,
        [phone, hashOtp(phone, code)],
      );
      if (!challenge.rowCount) {
        throw new Error('INVALID_CODE');
      }
      let identity = await client.query("select user_id from app.customer_identities where provider = 'phone' and provider_subject = $1", [phone]);
      let userId = identity.rows[0]?.user_id;
      if (!userId) {
        const user = await client.query("insert into app.users(account_type, display_name, phone) values ('customer', $1, $2) returning id", [`客户${phone.slice(-4)}`, phone]);
        userId = user.rows[0].id;
        await client.query("insert into app.customer_identities(user_id, provider, provider_subject, phone) values ($1, 'phone', $2, $2)", [userId, phone]);
      }
      const { token } = await createLoginSession(client, { config, userId, accountType: 'customer' });
      await client.query('commit');
      res.json({ token, customer: { id: userId, phone } });
    } catch (error) {
      await client.query('rollback');
      res.status(error.message === 'INVALID_CODE' ? 400 : 500).json({ error: error.message });
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/customer/qr/create', async (_req, res) => {
    const token = createSessionToken();
    if (!pool) {
      memory.qr = { token, status: 'pending', expiresAt: Date.now() + config.qrLoginTtlSeconds * 1000 };
      res.json({ token, status: 'pending' });
      return;
    }
    await pool.query("insert into app.qr_login_sessions(token, expires_at) values ($1, now() + ($2 || ' seconds')::interval)", [token, config.qrLoginTtlSeconds]);
    res.json({ token, status: 'pending' });
  });

  app.get('/destiny-api/customer/qr/status/:token', async (req, res) => {
    if (!pool) {
      if (memory.qr?.token !== req.params.token) {
        res.json({ token: req.params.token, status: 'expired' });
        return;
      }
      if (memory.qr.status === 'confirmed') {
        res.json({
          token: req.params.token,
          status: 'confirmed',
          customerToken: memory.qr.loginToken || memory.customerToken,
          customer: { id: memory.qr.customerId || 'dev-customer' },
        });
        return;
      }
      res.json(memory.qr);
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `
          select token, status, customer_id, expires_at
          from app.qr_login_sessions
          where token = $1
          for update
        `,
        [req.params.token],
      );
      const qr = result.rows[0];
      if (!qr || (qr.expires_at && new Date(qr.expires_at).getTime() <= Date.now())) {
        await client.query('commit');
        res.json({ token: req.params.token, status: 'expired' });
        return;
      }
      if (qr.status !== 'confirmed' || !qr.customer_id) {
        await client.query('commit');
        res.json({ token: qr.token, status: qr.status, expires_at: qr.expires_at });
        return;
      }

      const { token: customerToken } = await createLoginSession(client, {
        config,
        userId: qr.customer_id,
        accountType: 'customer',
      });
      await client.query("update app.qr_login_sessions set status = 'cancelled' where token = $1", [qr.token]);
      await client.query('commit');
      res.json({
        token: qr.token,
        status: 'confirmed',
        customerToken,
        customer: { id: qr.customer_id },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/customer/qr/confirm', async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      res.status(400).json({ error: 'QR_TOKEN_REQUIRED' });
      return;
    }
    if (!pool) {
      memory.qr = { ...(memory.qr || {}), token, status: 'confirmed', customerId: nextId('customer'), loginToken: memory.customerToken };
      res.json({ ok: true, status: 'confirmed', customerId: memory.qr.customerId });
      return;
    }
    const session = await findSession(req, { pool, config, accountTypes: ['customer'] });
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const result = await pool.query(
      `
        update app.qr_login_sessions
        set status = 'confirmed',
            customer_id = $2,
            confirmed_at = now()
        where token = $1
          and status = 'pending'
          and expires_at > now()
        returning token, status, customer_id
      `,
      [token, session.user_id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: 'QR_SESSION_NOT_FOUND' });
      return;
    }
    res.json({ ok: true, status: 'confirmed', customerId: result.rows[0].customer_id });
  });
}
