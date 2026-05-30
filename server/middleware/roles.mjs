export function requirePlatformAdmin(req, res, pool = null) {
  if (!pool || req.session?.account_type === 'admin') {
    return true;
  }
  res.status(403).json({ error: 'ADMIN_ONLY' });
  return false;
}
