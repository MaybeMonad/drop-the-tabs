// Sync service for extension
import { 
  AdaptiveSyncManager, 
  generateKeyPair, 
  deriveSharedSecret,
  deriveAESKey
} from '@/stubs/shared-api';
import type { 
  AdapterConfig, 
  Tab, 
  TabChangeEvent,
  EncryptedPayload 
} from '@/stubs/shared-core';

/**
 * Extension sync service
 * Handles cloud synchronization with encryption
 */
export class SyncService {
  private manager: AdaptiveSyncManager;
  private deviceId: string;
  private userId: string | null = null;
  private encryptionKey: CryptoKey | null = null;
  private sequenceNumber: number = 0;

  constructor(config: AdapterConfig) {
    // Create adaptive manager with primary and optional fallback
    const primaryConfig = { ...config, type: config.type as any };
    const fallbackConfig = config.type === 'firebase' && config.customConfig
      ? { ...config, type: 'custom' as const }
      : undefined;

    this.manager = new AdaptiveSyncManager(primaryConfig, fallbackConfig);
    this.deviceId = this.generateDeviceId();
  }

  async connect(): Promise<void> {
    await this.manager.connect();
    
    // Authenticate anonymously
    const authResult = await this.manager.adapter.authenticate({
      type: 'anonymous'
    });
    
    this.userId = authResult.userId;
    
    // Setup encryption
    await this.setupEncryption();
    
    // Subscribe to remote changes
    this.subscribeToRemoteChanges();
    
    // Set presence
    await this.manager.adapter.setPresence(this.deviceId, {
      online: true,
      lastActive: Date.now()
    });

    console.log('[SyncService] Connected and authenticated');
  }

  async reconnect(): Promise<void> {
    await this.manager.connect();
  }

  async disconnect(): Promise<void> {
    if (this.userId) {
      await this.manager.adapter.setPresence(this.deviceId, {
        online: false,
        lastActive: Date.now()
      });
    }
    await this.manager.disconnect();
  }

  isConnected(): boolean {
    return this.manager.adapter.isConnected();
  }

  isUsingFallback(): boolean {
    return this.manager.isUsingFallback?.() || false;
  }

  /**
   * Publish tab change to cloud
   */
  async publishTabChange(event: TabChangeEvent): Promise<void> {
    if (!this.userId || !this.encryptionKey) return;

    const path = `users/${this.userId}/devices/${this.deviceId}/tabs`;
    
    // Get current tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabData = tabs.map(tab => this.convertTab(tab));

    // Encrypt
    const encrypted = await this.encryptData(tabData);

    // Publish
    await this.manager.adapter.publish(path, encrypted);
  }

  /**
   * Subscribe to remote tab changes from other devices
   */
  private subscribeToRemoteChanges(): void {
    if (!this.userId) return;

    // Subscribe to other devices' tab data
    const path = `users/${this.userId}/devices`;
    
    this.manager.adapter.subscribe(path, async (data) => {
      if (!data) return;

      // Process data from other devices
      for (const [deviceId, deviceData] of Object.entries(data)) {
        if (deviceId === this.deviceId) continue; // Skip own device

        console.log('[SyncService] Received update from device:', deviceId);
        
        // Decrypt and process
        // This would trigger UI updates or merge strategies
      }
    });
  }

  private async setupEncryption(): Promise<void> {
    // Generate device key pair
    const keyPair = await generateKeyPair();
    
    // Store public key in cloud
    if (this.userId) {
      await this.manager.adapter.set(
        `users/${this.userId}/devices/${this.deviceId}/publicKey`,
        this.arrayToBase64(keyPair.publicKey)
      );
    }

    // For now, use a simple key derivation
    // In production, implement proper key exchange with other devices
    const masterKey = await this.deriveMasterKey();
    this.encryptionKey = masterKey;
  }

  private async deriveMasterKey(): Promise<CryptoKey> {
    // Derive from device ID and user ID
    const material = `${this.deviceId}:${this.userId || 'anonymous'}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(material);
    
    // Use subtle crypto to derive key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
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

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      plaintext
    );

    // Extract auth tag (last 16 bytes)
    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const encryptedData = ciphertextArray.slice(0, -16);

    this.sequenceNumber++;

    return {
      iv: this.arrayToBase64(iv),
      data: this.arrayToBase64(encryptedData),
      authTag: this.arrayToBase64(authTag),
      timestamp: Date.now(),
      seq: this.sequenceNumber
    };
  }

  private generateDeviceId(): string {
    // Generate or retrieve persistent device ID
    const storageKey = 'device_id';
    
    // Try to get existing ID
    chrome.storage.local.get(storageKey).then((result) => {
      if (result[storageKey]) {
        return result[storageKey];
      }
    });

    // Generate new ID
    const id = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    chrome.storage.local.set({ [storageKey]: id });
    return id;
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
      lastModified: Date.now()
    };
  }

  private arrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array));
  }

  private base64ToArray(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
}
