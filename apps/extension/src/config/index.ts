// Extension configuration and constants

export const EXTENSION_CONFIG = {
  // Version
  version: '0.2.0',
  
  // Storage keys
  storage: {
    deviceId: 'device_id',
    userId: 'user_id',
    backendType: 'backend_type',
    backendConfig: 'backend_config',
    firebaseProjectId: 'firebase_project_id',
    syncConfig: 'sync_config',
  },
  
  // Default settings
  defaults: {
    autoGroup: true,
    smartReminders: true,
    tabThreshold: 15,
  },
  
  // Sync intervals (minutes)
  intervals: {
    autoCleanup: 5,
    saveStats: 1,
    syncCheck: 1,
    presenceUpdate: 1,
  },
  
  // Pairing
  pairing: {
    codeExpiryMinutes: 5,
    pollingIntervalMs: 2000,
  },
} as const;

// Feature flags
export const FEATURES = {
  enableSync: true,
  enableEncryption: true,
  enableAutoGroup: true,
  enableSmartReminders: true,
  enableSessions: true,
} as const;
