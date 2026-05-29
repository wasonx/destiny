import { hashSessionToken } from '../auth/sessions.mjs';

export function getBearerToken(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

export function requireSession({ pool, config, accountTypes = [] }) {
  return async (req, res, next) => {
    if (!pool) {
      res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
      return;
    }

    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const tokenHash = hashSessionToken(token, config.sessionSecret);
    const result = await pool.query(
      `
        select s.id as session_id, s.account_type, u.id as user_id, u.status, u.display_name
        from app.login_sessions s
        join app.users u on u.id = s.user_id
        where s.token_hash = $1
          and s.revoked_at is null
          and s.expires_at > now()
      `,
      [tokenHash],
    );

    const row = result.rows[0];
    if (!row || row.status !== 'active' || (accountTypes.length && !accountTypes.includes(row.account_type))) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    req.session = row;
    next();
  };
}
