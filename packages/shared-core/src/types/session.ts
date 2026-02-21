// packages/shared-core/src/types/session.ts

/**
 * A saved session of tabs
 */
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  tabs: SessionTab[];
  deviceId?: string;
}

/**
 * Tab within a session
 */
export interface SessionTab {
  url: string;
  title: string;
  favicon?: string;
  pinned: boolean;
  groupId?: number;
}

/**
 * Cross-device session
 */
export interface CrossDeviceSession extends Session {
  sourceDeviceId: string;
  targetDeviceId?: string;
}
