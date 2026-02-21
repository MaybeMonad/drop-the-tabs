// packages/shared-api/src/pairing/qr.ts

import type { QRCodePayload } from '@drop-the-tabs/shared-core';

/**
 * Generate QR code payload for pairing
 */
export function generateQRCodePayload(
  deviceId: string,
  publicKey: Uint8Array,
  userId?: string
): QRCodePayload {
  const now = Date.now();
  
  return {
    v: 1,
    did: deviceId,
    pk: arrayToBase64(publicKey),
    ts: now,
    exp: now + 5 * 60 * 1000, // 5 minutes expiry
    uid: userId,
  };
}

/**
 * Encode QR code payload to string
 */
export function encodeQRCode(payload: QRCodePayload): string {
  const json = JSON.stringify(payload);
  return btoa(json); // Base64 encode
}

/**
 * Decode QR code string to payload
 */
export function decodeQRCode(encoded: string): QRCodePayload {
  try {
    const json = atob(encoded); // Base64 decode
    const payload = JSON.parse(json) as QRCodePayload;
    
    // Validate
    if (payload.v !== 1) {
      throw new Error('Unsupported QR code version');
    }
    
    if (Date.now() > payload.exp) {
      throw new Error('QR code has expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid QR code format');
  }
}

/**
 * Extract public key from QR payload
 */
export function extractPublicKeyFromQR(payload: QRCodePayload): Uint8Array {
  return base64ToArray(payload.pk);
}

// Helper functions
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}
