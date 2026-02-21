// Complete pairing flow types and utilities
import type { Device, KeyPair } from '@drop-the-tabs/shared-core';

export interface PairingSession {
  id: string;
  deviceId: string;
  publicKey: Uint8Array;
  pairingCode?: string;
  status: 'pending' | 'paired' | 'expired' | 'error';
  createdAt: number;
  expiresAt: number;
  pairedDeviceId?: string;
  pairedDevicePublicKey?: Uint8Array;
  error?: string;
}

export interface PairingResult {
  success: boolean;
  userId?: string;
  anonymousId?: string;
  pairedDeviceId?: string;
  pairedDevicePublicKey?: Uint8Array;
  error?: string;
}

export interface PairingRequest {
  code: string;
  deviceId: string;
  publicKey: Uint8Array;
  deviceName?: string;
  deviceType: 'browser' | 'mobile';
  os?: string;
}

export interface PairingResponse {
  paired: boolean;
  deviceId?: string;
  publicKey?: string; // base64 encoded
  userId?: string;
  anonymousId?: string;
}

// Pairing flow state machine
export type PairingState = 
  | { type: 'idle' }
  | { type: 'generating' }
  | { type: 'waiting'; session: PairingSession }
  | { type: 'pairing'; session: PairingSession }
  | { type: 'completed'; result: PairingResult }
  | { type: 'error'; error: string };

// Events for pairing state machine
export type PairingEvent =
  | { type: 'GENERATE' }
  | { type: 'GENERATED'; session: PairingSession }
  | { type: 'CODE_SCANNED'; deviceId: string }
  | { type: 'PAIRING_REQUESTED'; request: PairingRequest }
  | { type: 'PAIRING_ACCEPTED'; response: PairingResponse }
  | { type: 'PAIRING_REJECTED'; reason: string }
  | { type: 'COMPLETED'; result: PairingResult }
  | { type: 'ERROR'; error: string }
  | { type: 'CANCEL' }
  | { type: 'TIMEOUT' };

// Pairing reducer for state management
export function pairingReducer(
  state: PairingState,
  event: PairingEvent
): PairingState {
  switch (state.type) {
    case 'idle':
      if (event.type === 'GENERATE') {
        return { type: 'generating' };
      }
      break;

    case 'generating':
      if (event.type === 'GENERATED') {
        return { type: 'waiting', session: event.session };
      }
      if (event.type === 'ERROR') {
        return { type: 'error', error: event.error };
      }
      break;

    case 'waiting':
      if (event.type === 'CODE_SCANNED') {
        return { type: 'pairing', session: state.session };
      }
      if (event.type === 'TIMEOUT') {
        return { type: 'error', error: 'Pairing code expired' };
      }
      if (event.type === 'CANCEL') {
        return { type: 'idle' };
      }
      break;

    case 'pairing':
      if (event.type === 'PAIRING_REQUESTED') {
        return { type: 'pairing', session: state.session };
      }
      if (event.type === 'COMPLETED') {
        return { type: 'completed', result: event.result };
      }
      if (event.type === 'PAIRING_REJECTED') {
        return { type: 'error', error: event.reason };
      }
      if (event.type === 'CANCEL') {
        return { type: 'idle' };
      }
      break;

    case 'completed':
    case 'error':
      if (event.type === 'GENERATE' || event.type === 'CANCEL') {
        return { type: 'idle' };
      }
      break;
  }

  return state;
}

// Generate unique pairing session ID
export function generatePairingSessionId(): string {
  return `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Convert ArrayBuffer to base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Create pairing session
export function createPairingSession(
  deviceId: string,
  keyPair: KeyPair,
  expiryMinutes: number = 5
): PairingSession {
  const now = Date.now();
  return {
    id: generatePairingSessionId(),
    deviceId,
    publicKey: keyPair.publicKey,
    status: 'pending',
    createdAt: now,
    expiresAt: now + expiryMinutes * 60 * 1000,
  };
}
