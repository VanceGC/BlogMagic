import CryptoJS from 'crypto-js';

// Use JWT_SECRET as encryption key (already available in env)
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-encryption-key-change-in-production';

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

