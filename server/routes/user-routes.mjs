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
        { id: 'dev-identity-wechat', provider: 'wechat', provider_subject: 'dev-openid', phone: null },
        { id: 'dev-identity-phone', provider: 'phone', provider_subject: '13800000000', phone: '13800000000' },
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
                'phone', ci.phone,
                'id', ci.id,
                'openid', ci.openid,
                'unionid', ci.unionid,
                'created_at', ci.created_at
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

  app.delete('/destiny-api/admin/users/:userId/identities/:identityId', async (req, res, next) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }
    if (!pool) {
      res.json({
        ok: true,
        identity: {
          id: req.params.identityId,
          user_id: req.params.userId,
        },
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      const identity = await client.query(
        `
          select ci.id, ci.user_id, ci.provider, ci.provider_subject, ci.phone
          from app.customer_identities ci
          join app.users u on u.id = ci.user_id
          where ci.user_id = $1
            and ci.id = $2
            and u.account_type = 'customer'
          for update
        `,
        [req.params.userId, req.params.identityId],
      );
      const row = identity.rows[0];
      if (!row) {
        await client.query('rollback');
        res.status(404).json({ error: 'IDENTITY_NOT_FOUND' });
        return;
      }

      const count = await client.query(
        `
          select count(*)::int as identity_count
          from app.customer_identities
          where user_id = $1
        `,
        [req.params.userId],
      );
      if (Number(count.rows[0]?.identity_count || 0) <= 1) {
        await client.query('rollback');
        res.status(400).json({ error: 'CANNOT_REMOVE_LAST_IDENTITY' });
        return;
      }

      await client.query(
        'delete from app.customer_identities where id = $1 and user_id = $2',
        [req.params.identityId, req.params.userId],
      );
      await client.query(
        `
          insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
          values ($1, $2, $3, $4, $5)
        `,
        [
          req.session?.user_id || null,
          'customer_identity.unlink',
          'customer',
          req.params.userId,
          {
            identityId: row.id,
            provider: row.provider,
            providerSubject: row.provider_subject,
            phone: row.phone || null,
          },
        ],
      );
      await client.query('commit');
      res.json({ ok: true, identity: row });
    } catch (error) {
      await client.query('rollback');
      next(error);
    } finally {
      client.release();
    }
  });

  app.post('/destiny-api/admin/users/:targetUserId/merge-customer', async (req, res, next) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }

    const targetUserId = req.params.targetUserId;
    const sourceUserId = String(req.body?.sourceUserId || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!sourceUserId) {
      res.status(400).json({ error: 'SOURCE_CUSTOMER_REQUIRED' });
      return;
    }
    if (sourceUserId === targetUserId) {
      res.status(400).json({ error: 'MERGE_TARGET_SAME_AS_SOURCE' });
      return;
    }

    if (!pool) {
      res.json({ ok: true, targetUserId, sourceUserId });
      return;
    }

    const client = await pool.connect();
    const movedTables = [];
    const moveRows = async (table, column, whereSuffix = '') => {
      const result = await client.query(
        `update app.${table} set ${column} = $1 where ${column} = $2${whereSuffix}`,
        [targetUserId, sourceUserId],
      );
      movedTables.push({ table, rows: result.rowCount || 0 });
    };

    try {
      await client.query('begin');
      const users = await client.query(
        `
          select id, account_type, status
          from app.users
          where id in ($1, $2)
          for update
        `,
        [targetUserId, sourceUserId],
      );
      const usersById = new Map(users.rows.map((row) => [String(row.id), row]));
      const targetUser = usersById.get(targetUserId);
      const sourceUser = usersById.get(sourceUserId);
      if (!targetUser || !sourceUser || targetUser.account_type !== 'customer' || sourceUser.account_type !== 'customer') {
        await client.query('rollback');
        res.status(404).json({ error: 'CUSTOMER_NOT_FOUND' });
        return;
      }

      await moveRows('customer_identities', 'user_id');
      await moveRows('login_sessions', 'user_id', " and account_type = 'customer'");
      await moveRows('qr_login_sessions', 'customer_id');
      await moveRows('report_runs', 'customer_id');
      await moveRows('customer_memberships', 'customer_id');
      await moveRows('customer_addresses', 'customer_id');
      await moveRows('commerce_orders', 'customer_id');
      await moveRows('refund_requests', 'customer_id');
      await moveRows('entitlement_ledger', 'customer_id');
      await moveRows('points_ledger', 'customer_id');

      await client.query(
        `
          insert into app.entitlement_accounts(customer_id, report_quota_balance, updated_at)
          select $1, report_quota_balance, now()
          from app.entitlement_accounts
          where customer_id = $2
          on conflict (customer_id) do update
            set report_quota_balance = app.entitlement_accounts.report_quota_balance + excluded.report_quota_balance,
                updated_at = now()
        `,
        [targetUserId, sourceUserId],
      );
      await client.query('delete from app.entitlement_accounts where customer_id = $1', [sourceUserId]);

      await client.query(
        `
          insert into app.points_accounts(customer_id, points_balance, lifetime_points, growth_level, updated_at)
          select $1, points_balance, lifetime_points, growth_level, now()
          from app.points_accounts
          where customer_id = $2
          on conflict (customer_id) do update
            set points_balance = app.points_accounts.points_balance + excluded.points_balance,
                lifetime_points = app.points_accounts.lifetime_points + excluded.lifetime_points,
                updated_at = now()
        `,
        [targetUserId, sourceUserId],
      );
      await client.query('delete from app.points_accounts where customer_id = $1', [sourceUserId]);

      await client.query("update app.users set status = 'disabled', updated_at = now() where id = $1", [sourceUserId]);
      await client.query(
        `
          insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
          values ($1, $2, $3, $4, $5)
        `,
        [
          req.session?.user_id || null,
          'customer.merge',
          'customer',
          targetUserId,
          {
            sourceUserId,
            reason: reason || null,
            movedTables,
          },
        ],
      );
      await client.query('commit');
      res.json({ ok: true, targetUserId, sourceUserId, movedTables });
    } catch (error) {
      await client.query('rollback');
      next(error);
    } finally {
      client.release();
    }
  });
}
