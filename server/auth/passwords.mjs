import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, keyLength);
  return `scrypt:${salt}:${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  const [scheme, salt, encoded] = String(storedHash || '').split(':');
  if (scheme !== 'scrypt' || !salt || !encoded) {
    return false;
  }

  const expected = Buffer.from(encoded, 'base64url');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
