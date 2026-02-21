// Backend configuration constants

export type BackendType = 'firebase' | 'custom' | 'docker';

export interface BackendConfig {
  type: BackendType;
  name: string;
  apiUrl: string;
  wsUrl?: string;
  description: string;
}

export const BACKEND_CONFIGS: Record<BackendType, BackendConfig> = {
  firebase: {
    type: 'firebase',
    name: 'Firebase Cloud',
    apiUrl: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api',
    description: 'Managed cloud service (recommended)',
  },
  custom: {
    type: 'custom',
    name: 'Self-Hosted',
    apiUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    description: 'Your own server',
  },
  docker: {
    type: 'docker',
    name: 'Docker Local',
    apiUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    description: 'Local Docker compose',
  },
};

// Get the actual Firebase URL (replace YOUR_PROJECT_ID)
export function getFirebaseUrl(projectId?: string): string {
  const id = projectId || 'drop-the-tabs-prod';
  return `https://us-central1-${id}.cloudfunctions.net/api`;
}

// Load saved backend config from storage
export async function loadBackendConfig(): Promise<BackendConfig> {
  const result = await chrome.storage.local.get(['backend_type', 'backend_config', 'firebase_project_id']);
  
  const type = (result.backend_type as BackendType) || 'firebase';
  const savedConfig = result.backend_config;
  
  if (type === 'firebase') {
    return {
      ...BACKEND_CONFIGS.firebase,
      apiUrl: getFirebaseUrl(result.firebase_project_id),
    };
  }
  
  if (savedConfig) {
    return savedConfig;
  }
  
  return BACKEND_CONFIGS[type] || BACKEND_CONFIGS.firebase;
}

// Save backend config to storage
export async function saveBackendConfig(config: BackendConfig): Promise<void> {
  await chrome.storage.local.set({
    backend_type: config.type,
    backend_config: config,
  });
  
  if (config.type === 'firebase') {
    // Extract project ID from URL
    const match = config.apiUrl.match(/us-central1-([^.]+)/);
    if (match) {
      await chrome.storage.local.set({ firebase_project_id: match[1] });
    }
  }
}

// Get default backend config
export function getDefaultBackendConfig(): BackendConfig {
  return {
    ...BACKEND_CONFIGS.firebase,
    apiUrl: getFirebaseUrl(),
  };
}
