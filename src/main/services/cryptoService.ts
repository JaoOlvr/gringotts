import crypto from 'node:crypto';

/**
 * Gera salt e hash seguro usando PBKDF2 com SHA-512
 */
export function hashSecret(secret: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Valida o segredo (PIN ou Senha) usando timingSafeEqual
 */
export function verifySecret(secret: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error('Error verifying secret:', err);
    return false;
  }
}
