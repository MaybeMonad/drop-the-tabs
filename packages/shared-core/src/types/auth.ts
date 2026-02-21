// packages/shared-core/src/types/auth.ts

/**
 * Authentication states
 */
export type AuthState = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

/**
 * User roles
 */
export type UserRole = 'free' | 'pro' | 'enterprise';

/**
 * User profile
 */
export interface User {
  id: string;
  email?: string;
  displayName?: string;
  role: UserRole;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Pairing code
 */
export interface PairingCode {
  code: string;
  deviceId: string;
  publicKey: string;
  expiresAt: number;
  used: boolean;
}

/**
 * QR code payload
 */
export interface QRCodePayload {
  v: number;
  did: string;
  pk: string;
  ts: number;
  exp: number;
  uid?: string;
}
