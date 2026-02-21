// Direct HTTP sync service for Firebase Functions
import type { Tab, TabChangeEvent, EncryptedPayload } from '@drop-the-tabs/shared-core';
import { generateKeyPair, arrayBufferToBase64, base64ToArrayBuffer } from '@drop-the-tabs/shared-api';

interface SyncConfig {
  apiUrl: string;
  userId: string;
  deviceId: string;
}

/**
 * Simple HTTP-based sync service
 * Directly calls Firebase Functions REST API
 */
export class DirectSyncService {
  private apiUrl: string;
  private userId: string | null = null;
  private deviceId: string;
  private encryptionKey: CryptoKey | null = null;
  private connected: boolean = false;
  private sequenceNumber: number = 0;

  constructor() {
    this.apiUrl = '';
    this.deviceId = '';
  }

  async initialize(apiUrl: string): Promise<void> {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    
    // Generate device ID
    const stored = await chrome.storage.local.get('device_id');
    if (stored.device_id) {
      this.deviceId = stored.device_id;
    } else {
      this.deviceId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.storage.local.set({ device_id: this.deviceId });
    }

    // Test connection
    const response = await fetch(`${this.apiUrl}/health`);
    if (response.ok) {
      this.connected = true;
      console.log('[DirectSync] Connected to:', this.apiUrl);
    }
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await this.setupEncryption();
    
    // Set presence
    await this.updatePresence(true);
    
    console.log('[DirectSync] User ID set:', userId);
  }

  async syncTabs(tabs: Tab[]): Promise<void> {
    if (!this.userId || !this.encryptionKey) {
      console.warn('[DirectSync] Not ready to sync');
      return;
    }

    try {
      // Encrypt tabs
      const encrypted = await this.encryptData(tabs);

      // Publish to API
      const response = await fetch(`${this.apiUrl}/sync/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          deviceId: this.deviceId,
          path: 'tabs',
          payload: encrypted,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      console.log('[DirectSync] Tabs synced:', tabs.length);
    } catch (error) {
      console.error('[DirectSync] Sync error:', error);
    }
  }

  async publishTabChange(event: TabChangeEvent): Promise<void> {
    // Get all tabs and sync
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabData = tabs.map(tab => this.convertTab(tab));
    await this.syncTabs(tabData);
  }

  isConnected(): boolean {
    return this.connected && !!this.userId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  private async setupEncryption(): Promise<void> {
    // Derive encryption key from deviceId + userId
    const material = `${this.deviceId}:${this.userId}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(material);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('drop-the-tabs-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptData(data: any): Promise<EncryptedPayload> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(json);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      plaintext
    );

    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const encryptedData = ciphertextArray.slice(0, -16);

    this.sequenceNumber++;

    return {
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(encryptedData),
      authTag: arrayBufferToBase64(authTag),
      timestamp: Date.now(),
      seq: this.sequenceNumber,
    };
  }

  private async updatePresence(online: boolean): Promise<void> {
    if (!this.userId) return;

    try {
      await fetch(`${this.apiUrl}/sync/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          deviceId: this.deviceId,
          isOnline: online,
        }),
      });
    } catch (error) {
      console.error('[DirectSync] Presence update failed:', error);
    }
  }

  private convertTab(tab: chrome.tabs.Tab): Tab {
    const url = tab.url || '';
    let domain = 'unknown';
    
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // Invalid URL
    }

    return {
      id: tab.id || 0,
      url,
      title: tab.title || '',
      domain,
      favicon: tab.favIconUrl,
      active: tab.active || false,
      pinned: tab.pinned || false,
      groupId: tab.groupId || -1,
      deviceId: this.deviceId,
      lastModified: Date.now(),
    };
  }
}

// Singleton instance
let syncService: DirectSyncService | null = null;

export function getSyncService(): DirectSyncService {
  if (!syncService) {
    syncService = new DirectSyncService();
  }
  return syncService;
}

export { DirectSyncService };
