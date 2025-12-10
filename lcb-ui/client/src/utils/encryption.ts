/*
 * Simple encryption utility for token storage
 * Uses XOR cipher with obfuscation for local development security
 *
 * Note: This is NOT cryptographically secure encryption. It's designed to:
 * - Prevent casual inspection of tokens in localStorage
 * - Add a layer of obfuscation for local development
 * - Avoid storing tokens in plain text
 *
 * For production, use proper encryption (AES-GCM with Web Crypto API)
 */

/**
 * Generate a simple key from a static seed
 * Uses a combination of app name and constant for consistency
 */
function getEncryptionKey(): string {
  // Static key derived from app name (consistent across sessions)
  const seed = 'lcb-ui-token-encryption-v1';
  let key = '';
  for (let i = 0; i < seed.length; i++) {
    key += String.fromCharCode(seed.charCodeAt(i) ^ 0x5A);
  }
  return btoa(key);
}

/**
 * XOR cipher encryption
 * Simple but effective for obfuscation
 */
function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Encrypt a string value
 * @param value Plain text to encrypt
 * @returns Encrypted base64 string
 */
export function encrypt(value: string): string {
  try {
    const key = getEncryptionKey();

    // Add random salt prefix for additional obfuscation
    const salt = Math.random().toString(36).substring(2, 10);
    const payload = salt + '::' + value;

    // XOR cipher
    const encrypted = xorCipher(payload, key);

    // Base64 encode
    const encoded = btoa(encrypted);

    // Add version prefix
    return 'v1:' + encoded;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    // Fallback: return base64 encoded value (better than plain text)
    return 'v0:' + btoa(value);
  }
}

/**
 * Decrypt a string value
 * @param encrypted Encrypted base64 string
 * @returns Decrypted plain text or null if decryption fails
 */
export function decrypt(encrypted: string): string | null {
  try {
    // Check version
    if (!encrypted.startsWith('v1:') && !encrypted.startsWith('v0:')) {
      console.error('[Encryption] Invalid encrypted value format');
      return null;
    }

    const version = encrypted.substring(0, 2);
    const payload = encrypted.substring(3);

    // v0 = fallback base64 only
    if (version === 'v0') {
      return atob(payload);
    }

    // v1 = XOR cipher + base64
    const key = getEncryptionKey();

    // Base64 decode
    const decoded = atob(payload);

    // XOR decipher
    const decrypted = xorCipher(decoded, key);

    // Remove salt prefix
    const parts = decrypted.split('::');
    if (parts.length !== 2) {
      console.error('[Encryption] Invalid decrypted payload format');
      return null;
    }

    return parts[1];
  } catch (error) {
    console.error('[Encryption] Failed to decrypt:', error);
    return null;
  }
}

/**
 * Encrypt an object (JSON)
 * @param obj Object to encrypt
 * @returns Encrypted string
 */
export function encryptObject(obj: any): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Decrypt an object (JSON)
 * @param encrypted Encrypted string
 * @returns Decrypted object or null
 */
export function decryptObject<T = any>(encrypted: string): T | null {
  const decrypted = decrypt(encrypted);
  if (!decrypted) {
    return null;
  }

  try {
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('[Encryption] Failed to parse decrypted JSON:', error);
    return null;
  }
}
