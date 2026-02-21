// Mobile backend configuration

export type BackendType = 'firebase' | 'custom';

export interface BackendConfig {
  type: BackendType;
  name: string;
  apiUrl: string;
  wsUrl?: string;
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
} as any;

// Default Firebase URL
export const DEFAULT_FIREBASE_URL = 'https://us-central1-drop-the-tabs-prod.cloudfunctions.net/api';

// Get Firebase URL with project ID
export function getFirebaseUrl(projectId: string = 'drop-the-tabs-prod'): string {
  return `https://us-central1-${projectId}.cloudfunctions.net/api`;
}
