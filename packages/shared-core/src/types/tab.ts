// packages/shared-core/src/types/tab.ts

/**
 * Represents a browser tab
 */
export interface Tab {
  id: number;
  url: string;
  title: string;
  domain: string;
  favicon?: string;
  active: boolean;
  pinned: boolean;
  groupId: number;
  deviceId: string;
  lastModified: number;
}

/**
 * Grouped tabs by domain
 */
export interface TabGroup {
  domain: string;
  tabs: Tab[];
  count: number;
}

/**
 * Tab change event types
 */
export type TabChangeType = 'created' | 'updated' | 'removed' | 'activated' | 'moved';

export interface TabChangeEvent {
  type: TabChangeType;
  tab: Tab;
  timestamp: number;
}

/**
 * Tab query filters
 */
export interface TabQuery {
  active?: boolean;
  pinned?: boolean;
  deviceId?: string;
  domain?: string;
}
