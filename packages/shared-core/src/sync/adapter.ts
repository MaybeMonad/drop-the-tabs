// packages/shared-core/src/sync/adapter.ts

import type { 
  SyncAdapter, 
  AdapterConfig, 
  AuthCredentials, 
  AuthResult, 
  PresenceStatus,
  Unsubscribe 
} from '../types/index.js';

/**
 * Abstract base class for sync adapters
 * Provides common functionality for Firebase and custom adapters
 */
export abstract class BaseSyncAdapter implements SyncAdapter {
  protected config: AdapterConfig;
  protected connected: boolean = false;
  protected listeners: Map<string, Unsubscribe> = new Map();
  protected connectionCallbacks: Set<() => void> = new Set();
  protected disconnectionCallbacks: Set<() => void> = new Set();
  protected errorCallbacks: Set<(error: Error) => void> = new Set();

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  abstract refreshToken(): Promise<string>;
  abstract subscribe(path: string, callback: (data: any) => void): Unsubscribe;
  abstract publish(path: string, data: any): Promise<void>;
  abstract get<T = any>(path: string): Promise<T | null>;
  abstract set<T = any>(path: string, data: T): Promise<void>;
  abstract update<T = any>(path: string, updates: Partial<T>): Promise<void>;
  abstract delete(path: string): Promise<void>;
  abstract setPresence(deviceId: string, status: PresenceStatus): Promise<void>;
  abstract onPresenceChange(deviceId: string, callback: (status: PresenceStatus) => void): Unsubscribe;

  isConnected(): boolean {
    return this.connected;
  }

  onConnect(callback: () => void): Unsubscribe {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  onDisconnect(callback: () => void): Unsubscribe {
    this.disconnectionCallbacks.add(callback);
    return () => this.disconnectionCallbacks.delete(callback);
  }

  onError(callback: (error: Error) => void): Unsubscribe {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  protected emitConnected(): void {
    this.connectionCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('Connection callback error:', e); }
    });
  }

  protected emitDisconnected(): void {
    this.disconnectionCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('Disconnection callback error:', e); }
    });
  }

  protected emitError(error: Error): void {
    this.errorCallbacks.forEach(cb => {
      try { cb(error); } catch (e) { console.error('Error callback error:', e); }
    });
  }
}
