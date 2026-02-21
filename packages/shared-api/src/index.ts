// packages/shared-api/src/index.ts

// Register adapters
import { SyncAdapterFactory } from '@drop-the-tabs/shared-core';
import { FirebaseAdapter } from './adapters/firebase.js';
import { CustomAdapter } from './adapters/custom.js';

// Register Firebase adapter
SyncAdapterFactory.register('firebase', FirebaseAdapter);

// Register Custom adapter
SyncAdapterFactory.register('custom', CustomAdapter);

// Re-export everything
export * from './adapters/index.js';
export * from './pairing/index.js';
export * from './crypto/index.js';
export * from './sync/realtime.js';

// Re-export from shared-core for convenience
export { 
  SyncAdapterFactory, 
  AdaptiveSyncManager,
  BaseSyncAdapter 
} from '@drop-the-tabs/shared-core';

export type { SyncAdapter } from '@drop-the-tabs/shared-core';
