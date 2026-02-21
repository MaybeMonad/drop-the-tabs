// Temporary stub for @drop-the-tabs/shared-core

export interface AdapterConfig {
  type: 'firebase' | 'custom';
  url?: string;
}

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface TabChangeEvent {
  type: 'add' | 'remove' | 'update';
  tab: Tab;
}

export interface EncryptedPayload {
  iv: string;
  data: string;
  authTag: string;
  timestamp: number;
  seq: number;
}

export const TabEventType = {
  ADD: 'add' as const,
  REMOVE: 'remove' as const,
  UPDATE: 'update' as const,
};
