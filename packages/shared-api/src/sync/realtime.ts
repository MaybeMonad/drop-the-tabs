// Real-time sync service using WebSocket
import { EventEmitter } from 'events';
import type { Tab, TabChangeEvent, SyncAdapter, AdapterConfig } from '@drop-the-tabs/shared-core';
import { keyExchangeService } from '../crypto/index.js';

export interface SyncMessage {
  type: 'handshake' | 'sync' | 'ping' | 'pong' | 'error' | 'ack';
  payload?: any;
  timestamp: number;
  deviceId?: string;
}

export interface SyncOptions {
  deviceId: string;
  serverUrl: string;
  userId: string;
  onTabsUpdate?: (tabs: Tab[]) => void;
  onDeviceConnect?: (deviceId: string) => void;
  onDeviceDisconnect?: (deviceId: string) => void;
  onError?: (error: Error) => void;
}

export enum SyncStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  HANDSHAKING = 'handshaking',
  CONNECTED = 'connected',
  SYNCING = 'syncing',
  ERROR = 'error',
}

export class RealtimeSyncService extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: SyncOptions;
  private status: SyncStatus = SyncStatus.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private pendingChanges: TabChangeEvent[] = [];
  private sessionId: string | null = null;

  constructor(options: SyncOptions) {
    super();
    this.options = options;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === SyncStatus.CONNECTED || this.status === SyncStatus.SYNCING;
  }

  async connect(): Promise<void> {
    if (this.status === SyncStatus.CONNECTING || this.status === SyncStatus.HANDSHAKING) {
      return;
    }

    this.status = SyncStatus.CONNECTING;
    this.emit('statusChange', this.status);

    try {
      const wsUrl = `${this.options.serverUrl}?userId=${this.options.userId}&deviceId=${this.options.deviceId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHandshake();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        this.handleError(new Error('WebSocket error'));
      };

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  disconnect(): void {
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = SyncStatus.DISCONNECTED;
    this.emit('statusChange', this.status);
  }

  async syncTabs(tabs: Tab[]): Promise<void> {
    if (!this.isConnected()) {
      // Queue for later
      // Queue a change for each tab
      for (const tab of tabs) {
        this.pendingChanges.push({
          type: 'updated',
          tab,
          timestamp: Date.now(),
        });
      }
      return;
    }

    this.sendMessage({
      type: 'sync',
      payload: { tabs },
      timestamp: Date.now(),
      deviceId: this.options.deviceId,
    });
  }

  async sendTabChange(event: TabChangeEvent): Promise<void> {
    if (!this.isConnected()) {
      this.pendingChanges.push(event);
      return;
    }

    this.sendMessage({
      type: 'sync',
      payload: event,
      timestamp: Date.now(),
      deviceId: this.options.deviceId,
    });
  }

  private startHandshake(): void {
    this.status = SyncStatus.HANDSHAKING;
    this.emit('statusChange', this.status);

    // Send handshake request
    this.sendMessage({
      type: 'handshake',
      payload: {
        deviceId: this.options.deviceId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: SyncMessage = JSON.parse(data);

      switch (message.type) {
        case 'handshake':
          this.handleHandshake(message);
          break;
        case 'sync':
          this.handleSync(message);
          break;
        case 'ping':
          this.sendMessage({ type: 'pong', timestamp: Date.now() });
          break;
        case 'pong':
          // Ping acknowledged
          break;
        case 'error':
          this.handleError(new Error(message.payload?.message || 'Sync error'));
          break;
        case 'ack':
          // Acknowledgment received
          break;
      }

      this.emit('message', message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleHandshake(message: SyncMessage): void {
    // Handshake completed
    this.status = SyncStatus.CONNECTED;
    this.emit('statusChange', this.status);
    this.emit('connected');

    // Start ping interval
    this.startPingInterval();

    // Process pending changes
    this.processPendingChanges();
  }

  private handleSync(message: SyncMessage): void {
    this.status = SyncStatus.SYNCING;
    this.emit('statusChange', this.status);

    if (message.payload?.tabs) {
      this.options.onTabsUpdate?.(message.payload.tabs);
    }

    // Send acknowledgment
    this.sendMessage({
      type: 'ack',
      payload: { received: message.timestamp },
      timestamp: Date.now(),
    });

    this.status = SyncStatus.CONNECTED;
    this.emit('statusChange', this.status);
  }

  private handleDisconnect(): void {
    this.stopPingInterval();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.status = SyncStatus.DISCONNECTED;
      this.emit('statusChange', this.status);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.status = SyncStatus.ERROR;
      this.emit('statusChange', this.status);
      this.emit('error', new Error('Max reconnection attempts reached'));
    }
  }

  private handleError(error: Error): void {
    this.status = SyncStatus.ERROR;
    this.emit('statusChange', this.status);
    this.emit('error', error);
    this.options.onError?.(error);
  }

  private sendMessage(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendMessage({ type: 'ping', timestamp: Date.now() });
    }, 30000); // 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async processPendingChanges(): Promise<void> {
    while (this.pendingChanges.length > 0) {
      const change = this.pendingChanges.shift();
      if (change) {
        await this.sendTabChange(change);
      }
    }
  }
}
