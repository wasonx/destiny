import { createLoginSession } from '../auth/sessions.mjs';
import { verifyPassword } from '../auth/passwords.mjs';
import { getBearerToken } from '../middleware/require-session.mjs';
import { memory } from './memory-state.mjs';

export function mountAdminAuthRoutes(app, { config, pool }) {
  app.post('/destiny-api/admin/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!pool) {
      if (username && password) {
        res.json({
          token: memory.adminToken,
          user: { id: 'dev-admin', username, displayName: username, role: 'admin' },
        });
        return;
      }
      res.status(400).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const result = await pool.query(
      `
        select u.id as user_id, u.display_name, a.username, a.password_hash, a.role
        from app.admin_accounts a
        join app.users u on u.id = a.user_id
        where a.username = $1 and u.status = 'active'
      `,
      [username],
    );
    const account = result.rows[0];
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      const { token } = await createLoginSession(client, { config, userId: account.user_id, accountType: account.role });
      await client.query('commit');
      res.json({
        token,
        user: { id: account.user_id, username: account.username, displayName: account.display_name || account.username, role: account.role },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.get('/destiny-api/admin/me', async (req, res) => {
    if (!pool) {
      const token = getBearerToken(req);
      if (token === memory.adminToken) {
        res.json({ user: { id: 'dev-admin', username: 'admin', displayName: 'admin', role: 'admin' } });
        return;
      }
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    res.status(501).json({ error: 'USE_SESSION_MIDDLEWARE_IN_PRODUCTION' });
  });
}
