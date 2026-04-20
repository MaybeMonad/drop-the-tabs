// Key exchange service for device pairing
import { 
  generateKeyPair, 
  deriveSharedSecret, 
  deriveAESKey,
  generateNonce,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '@drop-the-tabs/shared-core';
import type { KeyPair, EncryptedPayload } from '@drop-the-tabs/shared-core';

// Re-export crypto functions from shared-core
export { 
  generateKeyPair, 
  deriveSharedSecret, 
  deriveAESKey,
  generateNonce,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '@drop-the-tabs/shared-core';

export interface KeyExchangeSession {
  id: string;
  ourKeyPair: KeyPair;
  theirPublicKey?: Uint8Array;
  sharedSecret?: Uint8Array;
  aesKey?: Uint8Array;
  established: boolean;
  createdAt: number;
}

export class KeyExchangeService {
  private sessions: Map<string, KeyExchangeSession> = new Map();
  private readonly SESSION_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize a new key exchange session
   */
  async initiateExchange(sessionId: string): Promise<KeyExchangeSession> {
    const keyPair = await generateKeyPair();
    
    const session: KeyExchangeSession = {
      id: sessionId,
      ourKeyPair: keyPair,
      established: false,
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId);

    return session;
  }

  /**
   * Complete key exchange with remote public key
   */
  async completeExchange(
    sessionId: string, 
    theirPublicKey: Uint8Array
  ): Promise<KeyExchangeSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Key exchange session not found');
    }

    if (session.established) {
      return session;
    }

    // Derive shared secret
    const sharedSecret = await deriveSharedSecret(
      session.ourKeyPair.privateKey,
      theirPublicKey
    );

    // Derive AES key from shared secret
    const aesKey = await deriveAESKey(sharedSecret);

    // Update session
    session.theirPublicKey = theirPublicKey;
    session.sharedSecret = sharedSecret;
    session.aesKey = aesKey;
    session.established = true;

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get our public key for a session
   */
  getPublicKey(sessionId: string): Uint8Array {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Key exchange session not found');
    }
    return session.ourKeyPair.publicKey;
  }

  /**
   * Check if key exchange is established
   */
  isEstablished(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.established ?? false;
  }

  /**
   * Get AES key for encryption
   */
  getAESKey(sessionId: string): Uint8Array {
    const session = this.sessions.get(sessionId);
    if (!session?.aesKey) {
      throw new Error('Key exchange not established');
    }
    return session.aesKey;
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Encrypt data using established session
   */
  async encrypt(sessionId: string, data: any): Promise<EncryptedPayload> {
    const aesKey = this.getAESKey(sessionId);
    
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));
    
    const iv = generateNonce(12);

    // Import the raw AES key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      aesKey as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      cryptoKey,
      plaintext as BufferSource
    );

    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const encryptedData = ciphertextArray.slice(0, -16);

    return {
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      data: arrayBufferToBase64(encryptedData.buffer as ArrayBuffer),
      authTag: arrayBufferToBase64(authTag.buffer as ArrayBuffer),
      timestamp: Date.now(),
      seq: 0,
    };
  }

  /**
   * Decrypt data using established session
   */
  async decrypt(sessionId: string, payload: EncryptedPayload): Promise<any> {
    const aesKey = this.getAESKey(sessionId);
    
    const iv = base64ToArrayBuffer(payload.iv);
    const data = base64ToArrayBuffer(payload.data);
    const authTag = base64ToArrayBuffer(payload.authTag);

    // Combine data and auth tag
    const ciphertext = new Uint8Array(data.byteLength + authTag.byteLength);
    ciphertext.set(new Uint8Array(data), 0);
    ciphertext.set(new Uint8Array(authTag), data.byteLength);

    // Import the raw AES key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      aesKey as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  private scheduleCleanup(sessionId: string): void {
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, this.SESSION_TTL);
  }
}

export const keyExchangeService = new KeyExchangeService();
