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
