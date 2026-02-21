// Temporary stub for @drop-the-tabs/shared-api

export class AdaptiveSyncManager {
  adapter: any;
  async initialize() {}
  async syncTabs() {}
  async connect() {}
  async disconnect() {}
  onTabChange() {}
}

export class SyncAdapterFactory {
  static adapters = new Map();
  
  static register(name: string, adapter: any) {
    this.adapters.set(name, adapter);
  }
  
  static createAdapter() {
    return null;
  }
}

export class FirebaseAdapter {
  async authenticate() { return { userId: 'stub-user' }; }
  async setPresence() {}
  async set() {}
  async publish() {}
  async subscribe() {}
  isConnected() { return false; }
}

export class CustomAdapter {
  async authenticate() { return { userId: 'stub-user' }; }
  async setPresence() {}
  async set() {}
  async publish() {}
  async subscribe() {}
  isConnected() { return false; }
}

export const keyExchangeService = {
  generatePairingCode: async () => 'STUB-CODE',
  joinPairing: async () => {},
};

export type PairingStateType = 'idle' | 'pairing' | 'connected' | 'error';
export interface PairingState {
  type: 'idle' | 'generating' | 'waiting' | 'completed' | 'error';
  session?: any;
  error?: string;
  result?: any;
}

export interface PairingSession {
  id: string;
  state: PairingStateType;
}

// Crypto exports
export async function generateKeyPair() {
  return { 
    publicKey: new Uint8Array(32), 
    privateKey: new Uint8Array(32) 
  };
}

export async function deriveSharedSecret() {
  return new Uint8Array(32);
}

export async function deriveAESKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function generateQRCodePayload(data: { did: string; pk: Uint8Array; ts: number }) {
  return JSON.stringify({ deviceId: data.did, timestamp: data.ts });
}

export function createPairingSession(deviceId: string, keyPair: any, ttlMinutes: number) {
  return {
    id: `session-${Date.now()}`,
    deviceId,
    ttl: ttlMinutes * 60 * 1000,
    createdAt: Date.now(),
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...arr));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
