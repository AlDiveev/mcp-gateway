import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = scryptSync(password, salt, KEY_LEN);
  const stored = Buffer.from(hash, 'hex');
  if (stored.length !== computed.length) return false;
  return timingSafeEqual(stored, computed);
}
