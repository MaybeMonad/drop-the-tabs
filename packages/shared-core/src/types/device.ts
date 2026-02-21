// packages/shared-core/src/types/device.ts

/**
 * Device types
 */
export type DeviceType = 'browser' | 'mobile';

/**
 * Supported browsers
 */
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge';

/**
 * Device information
 */
export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  os?: string;
  browser?: BrowserType;
  userId: string;
  publicKey: string;
  isOnline: boolean;
  lastSeen: number;
  pairedAt: number;
}

/**
 * Device presence status
 */
export interface PresenceStatus {
  online: boolean;
  lastActive?: number;
  batteryLevel?: number;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  supportsEncryption: boolean;
  supportsOffline: boolean;
  maxSessionSize: number;
}
