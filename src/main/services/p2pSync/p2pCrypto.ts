import crypto from 'node:crypto';

export interface EncryptedSyncEnvelope {
  salt: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
  ciphertext: string; // Base64
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
export function encryptPayload(data: unknown, pairingCode: string): EncryptedSyncEnvelope {
  const normalizedKey = normalizePairingCode(pairingCode);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // Padrão GCM: 12 bytes

  const key = crypto.scryptSync(normalizedKey, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const ciphertextBuffer = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertextBuffer.toString('base64'),
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

  const key = crypto.scryptSync(normalizedKey, salt, 32);
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
