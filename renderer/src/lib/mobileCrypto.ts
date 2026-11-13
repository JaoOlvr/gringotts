export interface EncryptedSyncEnvelope {
  salt: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
  ciphertext: string; // Base64
  kdf?: 'pbkdf2' | 'scrypt';
}

export function normalizePairingCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Criptografa um payload no ambiente mobile/web usando Web Crypto API (PBKDF2 + AES-GCM)
 */
export async function encryptPayloadWeb(
  data: unknown,
  pairingCode: string
): Promise<EncryptedSyncEnvelope> {
  const normalizedKey = normalizePairingCode(pairingCode);
  const enc = new TextEncoder();

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(normalizedKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const plaintext = enc.encode(typeof data === 'string' ? data : JSON.stringify(data));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  const encryptedBytes = new Uint8Array(encryptedBuf);
  // WebCrypto concatena a authTag (16 bytes) ao final do buffer criptografado
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(authTagBytes),
    ciphertext: bytesToBase64(ciphertextBytes),
    kdf: 'pbkdf2',
  };
}

/**
 * Descriptografa um envelope no ambiente mobile/web usando Web Crypto API (PBKDF2 + AES-GCM)
 */
export async function decryptPayloadWeb<T = any>(
  envelope: EncryptedSyncEnvelope,
  pairingCode: string
): Promise<T> {
  const normalizedKey = normalizePairingCode(pairingCode);
  const enc = new TextEncoder();

  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const authTag = base64ToBytes(envelope.authTag);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(normalizedKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Reconstrói o formato exigido pelo WebCrypto (ciphertext + authTag)
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    combined
  );

  const dec = new TextDecoder();
  const text = dec.decode(decryptedBuf);

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
