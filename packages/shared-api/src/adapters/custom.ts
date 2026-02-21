// packages/shared-api/src/adapters/custom.ts

import type {
  SyncAdapter,
  AdapterConfig,
  AuthCredentials,
  AuthResult,
  PresenceStatus,
  Unsubscribe,
  EncryptedPayload,
  CustomBackendConfig,
} from '@drop-the-tabs/shared-core';
import { BaseSyncAdapter } from '@drop-the-tabs/shared-core';

/**
 * WebSocket-based adapter for self-hosted backend
 * Implements the SyncAdapter interface using WebSocket connection
 */
export class CustomAdapter extends BaseSyncAdapter implements SyncAdapter {
  private ws: WebSocket | null = null;
  private httpEndpoint: string;
  private wsEndpoint: string;
  private apiVersion: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private messageQueue: ClientMessage[] = [];
  private pendingAcks: Map<string, (response: ServerMessage) => void> = new Map();
  private subscriptions: Map<string, (data: any) => void> = new Map();

  constructor(config: AdapterConfig) {
    super(config);

    if (!config.customConfig) {
      throw new Error('Custom backend config is required for CustomAdapter');
    }

    this.httpEndpoint = config.customConfig.httpEndpoint;
    this.wsEndpoint = config.customConfig.wsEndpoint;
    this.apiVersion = config.customConfig.apiVersion;
    this.maxReconnectAttempts = config.retryAttempts;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsEndpoint);

      this.ws.onopen = () => {
        console.log('CustomAdapter: WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.flushQueue();
        this.emitConnected();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('CustomAdapter: Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('CustomAdapter: WebSocket error:', error);
        this.emitError(new Error('WebSocket error'));
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('CustomAdapter: WebSocket closed');
        this.connected = false;
        this.emitDisconnected();
        this.attemptReconnect();
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.subscriptions.clear();
    this.pendingAcks.clear();
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    // Send auth message via WebSocket
    const response = await this.sendAndWait({
      id: generateId(),
      type: 'auth',
      payload: credentials,
    });

    if (response.type === 'auth_success') {
      return response.payload;
    } else {
      throw new Error(response.payload?.message || 'Authentication failed');
    }
  }

  async refreshToken(): Promise<string> {
    // Use HTTP API to refresh token
    const response = await fetch(`${this.httpEndpoint}/${this.apiVersion}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.token;
  }

  subscribe(path: string, callback: (data: any) => void): Unsubscribe {
    this.subscriptions.set(path, callback);

    // Send subscribe message
    this.send({
      id: generateId(),
      type: 'subscribe',
      payload: { path },
    });

    return () => {
      this.subscriptions.delete(path);
      this.send({
        id: generateId(),
        type: 'unsubscribe',
        payload: { path },
      });
    };
  }

  async publish(path: string, data: EncryptedPayload): Promise<void> {
    await this.sendAndWait({
      id: generateId(),
      type: 'publish',
      payload: { path, data },
    });
  }

  async get<T = any>(path: string): Promise<T | null> {
    const response = await fetch(`${this.httpEndpoint}/${this.apiVersion}/data${path}`);
    
    if (!response.ok) {
      throw new Error(`GET failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async set<T = any>(path: string, data: T): Promise<void> {
    const response = await fetch(`${this.httpEndpoint}/${this.apiVersion}/data${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`SET failed: ${response.statusText}`);
    }
  }

  async update<T = any>(path: string, updates: Partial<T>): Promise<void> {
    const response = await fetch(`${this.httpEndpoint}/${this.apiVersion}/data${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`UPDATE failed: ${response.statusText}`);
    }
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.httpEndpoint}/${this.apiVersion}/data${path}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`DELETE failed: ${response.statusText}`);
    }
  }

  async setPresence(deviceId: string, status: PresenceStatus): Promise<void> {
    this.send({
      id: generateId(),
      type: 'presence',
      payload: { deviceId, status },
    });
  }

  onPresenceChange(deviceId: string, callback: (status: PresenceStatus) => void): Unsubscribe {
    // Subscribe to presence path
    const path = `presence/${deviceId}`;
    return this.subscribe(path, callback);
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: ServerMessage): void {
    // Handle acknowledgment
    if (message.id && this.pendingAcks.has(message.id)) {
      const resolver = this.pendingAcks.get(message.id)!;
      resolver(message);
      this.pendingAcks.delete(message.id);
      return;
    }

    // Handle data updates
    if (message.type === 'data' && message.payload?.path) {
      const { path, data } = message.payload;
      const callback = this.subscriptions.get(path);
      if (callback) {
        callback(data);
      }
    }

    // Handle errors
    if (message.type === 'error') {
      console.error('CustomAdapter: Server error:', message.payload);
      this.emitError(new Error(message.payload?.message || 'Unknown server error'));
    }
  }

  private send(message: ClientMessage): void {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private sendAndWait(message: ClientMessage): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      // Set up acknowledgment handler
      this.pendingAcks.set(message.id, (response) => {
        if (response.type === 'error') {
          reject(new Error(response.payload?.message || 'Request failed'));
        } else {
          resolve(response);
        }
      });

      // Send message
      this.send(message);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingAcks.has(message.id)) {
          this.pendingAcks.delete(message.id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('CustomAdapter: Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`CustomAdapter: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, delay);
  }
}

// Types for WebSocket messages
interface ClientMessage {
  id: string;
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'publish' | 'presence' | 'ping';
  payload: any;
}

interface ServerMessage {
  id?: string;
  type: 'auth_success' | 'auth_error' | 'data' | 'error' | 'pong';
  payload?: any;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
