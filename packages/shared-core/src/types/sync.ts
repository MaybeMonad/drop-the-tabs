// packages/shared-core/src/types/sync.ts

import type { Device } from './device.js';

/**
 * Sync adapter types
 */
export type AdapterType = 'firebase' | 'custom' | 'adaptive';

/**
 * Base adapter configuration
 */
export interface BaseAdapterConfig {
  type: AdapterType;
  encryptionEnabled: boolean;
  retryAttempts: number;
  reconnectInterval: number;
}

/**
 * Firebase-specific configuration
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  databaseURL: string;
  messagingSenderId?: string;
  appId?: string;
}

/**
 * Custom backend configuration
 */
export interface CustomBackendConfig {
  wsEndpoint: string;
  httpEndpoint: string;
  apiVersion: string;
}

/**
 * Complete adapter configuration
 */
export interface AdapterConfig extends BaseAdapterConfig {
  firebaseConfig?: FirebaseConfig;
  customConfig?: CustomBackendConfig;
}

/**
 * Sync operation types
 */
export type SyncOperation = 'push' | 'pull' | 'bidirectional';

/**
 * Sync status
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

/**
 * Sync conflict resolution strategies
 */
export type ConflictStrategy = 'last-write-wins' | 'device-priority' | 'manual';

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Encrypted payload for transport
 */
export interface EncryptedPayload {
  iv: string;
  data: string;
  authTag: string;
  timestamp: number;
  seq: number;
}

/**
 * Sync adapter interface
 * Implemented by both Firebase and custom adapters
 */
export interface SyncAdapter {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  refreshToken(): Promise<string>;

  // Real-time sync
  subscribe(path: string, callback: (data: any) => void): Unsubscribe;
  publish(path: string, data: EncryptedPayload): Promise<void>;

  // One-time operations
  get<T = any>(path: string): Promise<T | null>;
  set<T = any>(path: string, data: T): Promise<void>;
  update<T = any>(path: string, updates: Partial<T>): Promise<void>;
  delete(path: string): Promise<void>;

  // Presence
  setPresence(deviceId: string, status: PresenceStatus): Promise<void>;
  onPresenceChange(deviceId: string, callback: (status: PresenceStatus) => void): Unsubscribe;

  // Events
  onConnect(callback: () => void): Unsubscribe;
  onDisconnect(callback: () => void): Unsubscribe;
  onError(callback: (error: Error) => void): Unsubscribe;
}

/**
 * Presence status
 */
export interface PresenceStatus {
  online: boolean;
  lastActive?: number;
  batteryLevel?: number;
}

/**
 * Auth credentials
 */
export interface AuthCredentials {
  type: 'anonymous' | 'custom' | 'email';
  token?: string;
  email?: string;
  password?: string;
}

/**
 * Auth result
 */
export interface AuthResult {
  userId: string;
  token: string;
  expiresAt: number;
}
