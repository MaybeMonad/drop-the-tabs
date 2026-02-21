// Temporary stub for @drop-the-tabs/shared-core

export interface AdapterConfig {
  type: 'firebase' | 'custom';
  url?: string;
}

export interface Tab {
  id: string;
  url: string;
  title: string;
  domain?: string;
  favicon?: string;
  active?: boolean;
  pinned?: boolean;
  deviceId?: string;
  lastModified?: number;
}

export interface Session {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'browser' | 'mobile' | 'desktop';
  os?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface TabChangeEvent {
  type: 'add' | 'remove' | 'update';
  tab: Tab;
}

export const TabEventType = {
  ADD: 'add' as const,
  REMOVE: 'remove' as const,
  UPDATE: 'update' as const,
};
