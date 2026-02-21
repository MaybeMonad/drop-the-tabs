// Key exchange service for device pairing
import { 
  generateKeyPair, 
  deriveSharedSecret, 
  deriveAESKey,
  generateNonce
} from '@drop-the-tabs/shared-core';
import type { KeyPair, EncryptedPayload } from '@drop-the-tabs/shared-core';

export interface KeyExchangeSession {
  id: string;
  ourKeyPair: KeyPair;
  theirPublicKey?: Uint8Array;
  sharedSecret?: Uint8Array;
  aesKey?: CryptoKey;
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
  getAESKey(sessionId: string): CryptoKey {
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
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plaintext
    );

    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const encryptedData = ciphertextArray.slice(0, -16);

    return {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encryptedData),
      authTag: this.arrayBufferToBase64(authTag),
      timestamp: Date.now(),
      seq: 0,
    };
  }

  /**
   * Decrypt data using established session
   */
  async decrypt(sessionId: string, payload: EncryptedPayload): Promise<any> {
    const aesKey = this.getAESKey(sessionId);
    
    const iv = this.base64ToArrayBuffer(payload.iv);
    const data = this.base64ToArrayBuffer(payload.data);
    const authTag = this.base64ToArrayBuffer(payload.authTag);

    // Combine data and auth tag
    const ciphertext = new Uint8Array(data.byteLength + authTag.byteLength);
    ciphertext.set(new Uint8Array(data), 0);
    ciphertext.set(new Uint8Array(authTag), data.byteLength);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      aesKey,
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const keyExchangeService = new KeyExchangeService();
