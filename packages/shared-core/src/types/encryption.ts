// packages/shared-core/src/types/encryption.ts

/**
 * Key pair for X25519
 */
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyRotationInterval: number; // milliseconds
}

/**
 * Key derivation parameters
 */
export interface KDFParams {
  salt: Uint8Array;
  iterations: number;
}
