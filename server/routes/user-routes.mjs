import { memory } from './memory-state.mjs';

function requirePlatformAdmin(req, res, pool) {
  if (!pool || req.session?.account_type === 'admin') {
    return true;
  }
  res.status(403).json({ error: 'ADMIN_ONLY' });
  return false;
}

function memoryUsers() {
  return [
    {
      id: 'dev-customer',
      account_type: 'customer',
      status: 'active',
      display_name: '开发客户',
      phone: '13800000000',
      username: null,
      role: null,
      identities: [
        { provider: 'wechat', provider_subject: 'dev-openid', phone: null },
        { provider: 'phone', provider_subject: '13800000000', phone: '13800000000' },
      ],
    },
    {
      id: 'dev-editor',
      account_type: 'editor',
      status: 'active',
      display_name: '后端编辑人员',
      phone: null,
      username: 'editor',
      role: 'editor',
      identities: [],
    },
    {
      id: 'dev-admin',
      account_type: 'admin',
      status: 'active',
      display_name: '平台管理人员',
      phone: null,
      username: 'admin',
      role: 'admin',
      identities: [],
    },
  ];
}

export function mountUserRoutes(app, { pool = null } = {}) {
  app.get('/destiny-api/admin/users', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }

    const accountType = req.query.accountType || null;
    if (!pool) {
      const users = memoryUsers().filter((user) => !accountType || user.account_type === accountType);
      res.json({ users, tokenHints: { admin: memory.adminToken, customer: memory.customerToken } });
      return;
    }

    const result = await pool.query(
      `
        select
          u.id,
          u.account_type,
          u.status,
          u.display_name,
          u.phone,
          u.created_at,
          u.updated_at,
          a.username,
          a.role,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'provider', ci.provider,
                'provider_subject', ci.provider_subject,
                'phone', ci.phone
              )
            ) filter (where ci.id is not null),
            '[]'::jsonb
          ) as identities
        from app.users u
        left join app.admin_accounts a on a.user_id = u.id
        left join app.customer_identities ci on ci.user_id = u.id
        where ($1::text is null or u.account_type = $1)
        group by u.id, a.username, a.role
        order by u.created_at desc
        limit 200
      `,
      [accountType],
    );
    res.json({ users: result.rows });
  });
}
