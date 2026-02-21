// Mobile app backend configuration

export type BackendType = 'firebase' | 'custom';

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
    description: 'Managed cloud service',
  },
  custom: {
    type: 'custom',
    name: 'Self-Hosted',
    apiUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    description: 'Your own server',
  },
};

// Get Firebase URL with project ID
export function getFirebaseUrl(projectId?: string): string {
  const id = projectId || 'drop-the-tabs-prod';
  return `https://us-central1-${id}.cloudfunctions.net/api`;
}

// Default backend
export const DEFAULT_BACKEND: BackendConfig = {
  ...BACKEND_CONFIGS.firebase,
  apiUrl: getFirebaseUrl(),
};
