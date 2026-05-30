import { requirePlatformAdmin } from '../middleware/roles.mjs';
import { memory } from './memory-state.mjs';

function clampLimit(value) {
  return Math.max(1, Math.min(200, Number(value) || 100));
}

function memoryAuditLogs() {
  return [
    {
      id: 'dev-audit-1',
      actor_user_id: 'dev-admin',
      actor_name: '平台管理人员',
      action: 'customer_identity.unlink',
      target_type: 'customer',
      target_id: 'dev-customer',
      metadata: { provider: 'phone', source: 'memory' },
      created_at: new Date().toISOString(),
    },
  ];
}

export function mountAuditRoutes(app, { pool = null } = {}) {
  app.get('/destiny-api/admin/audit-logs', async (req, res) => {
    if (!requirePlatformAdmin(req, res, pool)) {
      return;
    }

    const action = req.query.action || null;
    const targetType = req.query.targetType || null;
    const targetId = req.query.targetId || null;
    const limit = clampLimit(req.query.limit);

    if (!pool) {
      const auditLogs = memoryAuditLogs()
        .filter((item) => !action || item.action === action)
        .filter((item) => !targetType || item.target_type === targetType)
        .filter((item) => !targetId || item.target_id === targetId);
      res.json({ auditLogs, tokenHints: { admin: memory.adminToken } });
      return;
    }

    const result = await pool.query(
      `
        select
          l.id,
          l.actor_user_id,
          actor.display_name as actor_name,
          l.action,
          l.target_type,
          l.target_id,
          l.metadata,
          l.created_at
        from app.audit_logs l
        left join app.users actor on actor.id = l.actor_user_id
        where l.action = coalesce($1::text, l.action)
          and l.target_type = coalesce($2::text, l.target_type)
          and l.target_id = coalesce($3::text, l.target_id)
        order by l.created_at desc
        limit $4
      `,
      [action, targetType, targetId, limit],
    );

    res.json({ auditLogs: result.rows });
  });
}
