// packages/shared-core/src/crypto/x25519.ts

import type { KeyPair } from '../types/index.js';

/**
 * Generate X25519 key pair
 * Uses libsodium or native Web Crypto API
 */
export async function generateKeyPair(): Promise<KeyPair> {
  // In browser/extension: use Web Crypto API with X25519
  // In Node.js: use @noble/curves/ed25519
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser environment
    const keyPair = await crypto.subtle.generateKey(
      { name: 'X25519' },
      true, // extractable
      ['deriveBits']
    ) as CryptoKeyPair;

    const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey),
    };
  }

  // Node.js environment - will be implemented with @noble/curves
  throw new Error('X25519 not implemented for this environment');
}

/**
 * Derive shared secret using ECDH
 */
export async function deriveSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const importedPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKey as BufferSource,
      { name: 'X25519' },
      false,
      ['deriveBits']
    );

    const importedPublicKey = await crypto.subtle.importKey(
      'raw',
      publicKey as BufferSource,
      { name: 'X25519' },
      false,
      []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'X25519',
        public: importedPublicKey,
      },
      importedPrivateKey,
      256
    );

    return new Uint8Array(sharedSecret);
  }

  throw new Error('ECDH not implemented for this environment');
}
