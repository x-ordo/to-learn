import crypto from 'crypto';

const ITERATIONS = 100_000;
const KEYLEN = 32; // 256-bit
const DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, itersStr, salt, hash] = stored.split('$');
    if (scheme !== 'pbkdf2' || !itersStr || !salt || !hash) return false;
    const iters = Number(itersStr);
    const derived = crypto.pbkdf2Sync(password, salt, iters, Buffer.from(hash, 'hex').length / 2, DIGEST).toString('hex');
    // constant-time compare
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

