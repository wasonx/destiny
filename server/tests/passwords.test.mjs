import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../auth/passwords.mjs';
import { createSessionToken, hashSessionToken } from '../auth/sessions.mjs';

test('scrypt password hashes verify original passwords only', async () => {
  const hash = await hashPassword('Correct Horse Battery Staple');

  assert.match(hash, /^scrypt:/);
  assert.equal(await verifyPassword('Correct Horse Battery Staple', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('session tokens are random and stored as secret hmac hashes', () => {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token, 'test-secret');

  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(token, tokenHash);
  assert.equal(hashSessionToken(token, 'test-secret'), tokenHash);
});
