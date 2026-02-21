// packages/shared-api/src/pairing/code.ts

/**
 * Generate a random 6-digit pairing code
 */
export function generatePairingCode(): string {
  // Use crypto-secure random if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(array[0] % 1000000).padStart(6, '0');
  }
  
  // Fallback for Node.js or non-browser environments
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

/**
 * Validate a pairing code format
 */
export function isValidPairingCode(code: string): boolean {
  // Must be exactly 6 digits
  return /^\d{6}$/.test(code);
}

/**
 * Generate multiple unique codes (for collision detection)
 */
export function generateUniqueCodes(count: number = 3): string[] {
  const codes = new Set<string>();
  
  while (codes.size < count) {
    codes.add(generatePairingCode());
  }
  
  return Array.from(codes);
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Filter to recent attempts within window
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    return recentAttempts.length < this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Add new attempt
    attempts.push(now);
    
    // Clean old attempts
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    this.attempts.set(identifier, recentAttempts);
  }

  getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Pairing code metadata
 */
export interface PairingCodeMetadata {
  code: string;
  deviceId: string;
  publicKey: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Create pairing code metadata
 */
export function createPairingCodeMetadata(
  code: string,
  deviceId: string,
  publicKey: Uint8Array
): PairingCodeMetadata {
  const now = Date.now();
  
  return {
    code,
    deviceId,
    publicKey: arrayToBase64(publicKey),
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    used: false,
  };
}

// Helper
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}
