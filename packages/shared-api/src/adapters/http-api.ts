// HTTP API adapter for Firebase Functions backend
import type {
  SyncAdapter,
  AdapterConfig,
  AuthCredentials,
  AuthResult,
  PresenceStatus,
  Unsubscribe,
  EncryptedPayload,
} from '@drop-the-tabs/shared-core';
import { BaseSyncAdapter } from '@drop-the-tabs/shared-core';

/**
 * HTTP API Adapter for Firebase Functions / Custom backend
 * Uses REST API instead of Firebase SDK
 */
export class HttpApiAdapter extends BaseSyncAdapter implements SyncAdapter {
  private apiUrl: string;
  private userId: string | null = null;
  private deviceId: string;
  private connected: boolean = false;
  private pollingIntervals: Map<string, number> = new Map();

  constructor(config: AdapterConfig) {
    super(config);
    
    // Support both 'custom' and 'firebase' types with httpEndpoint
    this.apiUrl = config.httpEndpoint || config.wsEndpoint?.replace('ws', 'http') || '';
    
    if (!this.apiUrl) {
      throw new Error('httpEndpoint is required for HttpApiAdapter');
    }

    // Remove trailing slash
    this.apiUrl = this.apiUrl.replace(/\/$/, '');
    
    // Generate device ID
    this.deviceId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(): Promise<void> {
    // Test connection with health check
    const response = await fetch(`${this.apiUrl}/health`);
    if (!response.ok) {
      throw new Error('Failed to connect to API');
    }
    
    this.connected = true;
    this.emitConnected();
    console.log('[HttpApiAdapter] Connected to:', this.apiUrl);
  }

  async disconnect(): Promise<void> {
    // Clear all polling intervals
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();

    this.connected = false;
    this.emitDisconnected();
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    // For Firebase Functions, auth is handled via the API
    // We'll get userId after pairing
    if (credentials.type === 'anonymous') {
      // Return a temporary anonymous result
      // Real userId comes from pairing
      return {
        userId: 'pending',
        token: '',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
    }
    
    throw new Error('Only anonymous auth is supported');
  }

  async refreshToken(): Promise<string> {
    // HTTP API doesn't use tokens in the same way
    return '';
  }

  subscribe(path: string, callback: (data: any) => void): Unsubscribe {
    // For HTTP API, we use polling instead of real-time subscriptions
    const pollInterval = 2000; // 2 seconds
    
    const intervalId = setInterval(async () => {
      try {
        const data = await this.get(path);
        callback(data);
      } catch (error) {
        console.error('[HttpApiAdapter] Poll error:', error);
      }
    }, pollInterval);

    this.pollingIntervals.set(path, intervalId as any);

    // Return unsubscribe function
    return () => {
      clearInterval(intervalId);
      this.pollingIntervals.delete(path);
    };
  }

  async publish(path: string, data: EncryptedPayload): Promise<void> {
    if (!this.userId) {
      console.warn('[HttpApiAdapter] No userId set, skipping publish');
      return;
    }

    const response = await fetch(`${this.apiUrl}/sync/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.userId,
        deviceId: this.deviceId,
        path,
        payload: data,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to publish: ${error}`);
    }
  }

  async get<T = any>(path: string): Promise<T | null> {
    if (!this.userId) {
      return null;
    }

    const response = await fetch(
      `${this.apiUrl}/sync/data?userId=${this.userId}&path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data as T | null;
  }

  async set<T = any>(path: string, data: T): Promise<void> {
    // Use update for single values
    await this.update(path, data as any);
  }

  async update<T = any>(path: string, updates: Partial<T>): Promise<void> {
    if (!this.userId) {
      throw new Error('No userId available');
    }

    // For HTTP API, we use the sync/publish endpoint
    const response = await fetch(`${this.apiUrl}/sync/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.userId,
        deviceId: this.deviceId,
        path,
        payload: updates,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update: ${error}`);
    }
  }

  async delete(path: string): Promise<void> {
    // HTTP API doesn't have a direct delete endpoint
    // Could be implemented if needed
    console.warn('[HttpApiAdapter] Delete not implemented');
  }

  async setPresence(deviceId: string, status: PresenceStatus): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      await fetch(`${this.apiUrl}/sync/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          deviceId,
          isOnline: status.online,
        }),
      });
    } catch (error) {
      console.error('[HttpApiAdapter] Failed to set presence:', error);
    }
  }

  onPresenceChange(deviceId: string, callback: (status: PresenceStatus) => void): Unsubscribe {
    // Poll presence status
    const pollInterval = 5000; // 5 seconds
    
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.apiUrl}/sync/devices/${this.userId}`
        );
        
        if (response.ok) {
          const result = await response.json();
          const devices = result.devices || [];
          const device = devices.find((d: any) => d.deviceId === deviceId);
          
          if (device) {
            callback({
              online: device.isOnline,
              lastActive: device.lastSeen,
            });
          }
        }
      } catch (error) {
        console.error('[HttpApiAdapter] Presence poll error:', error);
      }
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Custom method to set userId after pairing
  setUserId(userId: string): void {
    this.userId = userId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }
}
