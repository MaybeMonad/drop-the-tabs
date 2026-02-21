// packages/shared-core/src/crypto/aes.ts

import type { EncryptedData } from '../types/index.js';

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  plaintext: string,
  key: Uint8Array
): Promise<EncryptedData> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Generate random nonce (IV)
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    cryptoKey,
    encoder.encode(plaintext)
  );

  // Extract auth tag (last 16 bytes for GCM)
  const ciphertextArray = new Uint8Array(ciphertext);
  const tag = ciphertextArray.slice(-16);
  const encryptedData = ciphertextArray.slice(0, -16);

  return {
    ciphertext: encryptedData,
    nonce,
    tag,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: Uint8Array
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Combine ciphertext and tag for decryption
  const combined = new Uint8Array(
    encryptedData.ciphertext.length + encryptedData.tag.length
  );
  combined.set(encryptedData.ciphertext);
  combined.set(encryptedData.tag, encryptedData.ciphertext.length);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: encryptedData.nonce,
    },
    cryptoKey,
    combined
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Derive AES key from shared secret using HKDF
 */
export async function deriveAESKey(
  sharedSecret: Uint8Array,
  salt?: Uint8Array
): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Import shared secret as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive 256-bit key
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt || new Uint8Array(0),
      info: new Uint8Array(0),
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}
