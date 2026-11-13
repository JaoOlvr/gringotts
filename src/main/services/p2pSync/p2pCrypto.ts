import crypto from 'node:crypto';

export interface EncryptedSyncEnvelope {
  salt: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
  ciphertext: string; // Base64
  kdf?: 'pbkdf2' | 'scrypt';
}

/**
 * Gera um código de pareamento legível (ex: "492-817")
 */
export function generatePairingCode(): string {
  const num = crypto.randomInt(100000, 999999);
  const s = String(num);
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/**
 * Normaliza o código de pareamento (remove hífens e espaços)
 */
export function normalizePairingCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Criptografa um objeto ou string usando AES-256-GCM com chave derivada do código de pareamento
 */
export function encryptPayload(
  data: unknown,
  pairingCode: string,
  kdf: 'pbkdf2' | 'scrypt' = 'pbkdf2'
): EncryptedSyncEnvelope {
  const normalizedKey = normalizePairingCode(pairingCode);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // Padrão GCM: 12 bytes

  const key = kdf === 'scrypt'
    ? crypto.scryptSync(normalizedKey, salt, 32)
    : crypto.pbkdf2Sync(normalizedKey, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const ciphertextBuffer = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertextBuffer.toString('base64'),
    kdf,
  };
}

/**
 * Descriptografa um envelope AES-256-GCM validando a autenticidade
 */
export function decryptPayload<T = any>(envelope: EncryptedSyncEnvelope, pairingCode: string): T {
  const normalizedKey = normalizePairingCode(pairingCode);
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  const key = envelope.kdf === 'scrypt'
    ? crypto.scryptSync(normalizedKey, salt, 32)
    : crypto.pbkdf2Sync(normalizedKey, salt, 100000, 32, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const plaintext = decryptedBuffer.toString('utf-8');

  try {
    return JSON.parse(plaintext) as T;
  } catch {
    return plaintext as unknown as T;
  }
}

