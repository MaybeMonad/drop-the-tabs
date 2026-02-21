// Enhanced sync service with real-time capabilities
import { 
  RealtimeSyncService, 
  SyncStatus,
  keyExchangeService,
  type SyncOptions,
  type SyncMessage
} from '@drop-the-tabs/shared-api';
import type { Tab, TabChangeEvent } from '@drop-the-tabs/shared-core';

interface EnhancedSyncOptions {
  deviceId: string;
  userId: string;
  serverUrl: string;
  onTabsUpdate?: (tabs: Tab[]) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

export class EnhancedSyncService {
  private realtimeSync: RealtimeSyncService | null = null;
  private options: EnhancedSyncOptions;
  private currentTabs: Tab[] = [];
  private sessionId: string | null = null;

  constructor(options: EnhancedSyncOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const syncOptions: SyncOptions = {
      deviceId: this.options.deviceId,
      userId: this.options.userId,
      serverUrl: this.options.serverUrl,
      onTabsUpdate: (tabs) => {
        this.currentTabs = tabs;
        this.options.onTabsUpdate?.(tabs);
      },
      onError: (error) => {
        console.error('[EnhancedSync] Error:', error);
      },
    };

    this.realtimeSync = new RealtimeSyncService(syncOptions);

    // Listen for status changes
    this.realtimeSync.on('statusChange', (status: SyncStatus) => {
      console.log('[EnhancedSync] Status:', status);
      this.options.onStatusChange?.(status);
    });

    // Listen for connection
    this.realtimeSync.on('connected', () => {
      console.log('[EnhancedSync] Connected');
      // Sync current tabs immediately
      this.syncCurrentTabs();
    });

    // Listen for messages
    this.realtimeSync.on('message', (message: SyncMessage) => {
      this.handleMessage(message);
    });

    await this.realtimeSync.connect();
  }

  disconnect(): void {
    this.realtimeSync?.disconnect();
    this.realtimeSync = null;
  }

  isConnected(): boolean {
    return this.realtimeSync?.isConnected() ?? false;
  }

  getStatus(): SyncStatus {
    return this.realtimeSync?.getStatus() ?? SyncStatus.DISCONNECTED;
  }

  async publishTabChange(event: TabChangeEvent): Promise<void> {
    if (!this.realtimeSync?.isConnected()) {
      console.log('[EnhancedSync] Not connected, skipping sync');
      return;
    }

    await this.realtimeSync.sendTabChange(event);
  }

  async syncCurrentTabs(): Promise<void> {
    if (!this.realtimeSync?.isConnected()) return;

    // Get all current tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const convertedTabs = tabs.map(tab => this.convertToTab(tab));
    
    await this.realtimeSync.syncTabs(convertedTabs);
  }

  async requestRemoteTabs(deviceId: string): Promise<void> {
    if (!this.realtimeSync?.isConnected()) return;

    // Request tabs from a specific device
    // This would be handled by the server
    console.log('[EnhancedSync] Requesting tabs from device:', deviceId);
  }

  private handleMessage(message: SyncMessage): void {
    console.log('[EnhancedSync] Received message:', message.type);

    switch (message.type) {
      case 'sync':
        // Handle incoming sync data
        if (message.payload?.tabs) {
          this.options.onTabsUpdate?.(message.payload.tabs);
        }
        break;
      
      case 'handshake':
        // Key exchange could happen here
        break;
    }
  }

  private convertToTab(tab: chrome.tabs.Tab): Tab {
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
      deviceId: this.options.deviceId,
      lastModified: Date.now(),
    };
  }
}
