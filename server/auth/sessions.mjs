import { createHmac, randomBytes } from 'node:crypto';

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token, secret) {
  return createHmac('sha256', secret).update(token).digest('base64url');
}

export async function createLoginSession(client, { config, userId, accountType, ttlDays = 30 }) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token, config.sessionSecret);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await client.query(
    `
      insert into app.login_sessions(user_id, token_hash, account_type, expires_at)
      values ($1, $2, $3, $4)
    `,
    [userId, tokenHash, accountType, expiresAt],
  );

  return { token, expiresAt };
}
