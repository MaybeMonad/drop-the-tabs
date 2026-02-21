// packages/shared-api/src/pairing/index.ts

export { 
  generateQRCodePayload, 
  encodeQRCode, 
  decodeQRCode,
  extractPublicKeyFromQR 
} from './qr.js';

export { 
  generatePairingCode, 
  isValidPairingCode,
  generateUniqueCodes,
  RateLimiter,
  createPairingCodeMetadata
} from './code.js';

export type { PairingCodeMetadata } from './code.js';

export {
  pairingReducer,
  createPairingSession,
  generatePairingSessionId,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './flow.js';

export type {
  PairingSession,
  PairingResult,
  PairingRequest,
  PairingResponse,
  PairingState,
  PairingEvent,
} from './flow.js';
