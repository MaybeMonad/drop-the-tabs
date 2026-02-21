import { useState, useCallback } from 'react';
import { generateKeyPair, arrayBufferToBase64 } from '@drop-the-tabs/shared-api';

const PAIRING_SERVER_URL = 'http://localhost:3000'; // Update with your server URL

interface PairingResult {
  success: boolean;
  userId?: string;
  anonymousId?: string;
  pairedDeviceId?: string;
  pairedDevicePublicKey?: Uint8Array;
  error?: string;
}

interface UseMobilePairingReturn {
  isPairing: boolean;
  result: PairingResult | null;
  pairWithCode: (code: string, deviceId: string, deviceName?: string) => Promise<void>;
  pairWithQR: (qrData: string, deviceId: string, deviceName?: string) => Promise<void>;
  reset: () => void;
}

export function useMobilePairing(): UseMobilePairingReturn {
  const [isPairing, setIsPairing] = useState(false);
  const [result, setResult] = useState<PairingResult | null>(null);

  const pairWithCode = useCallback(async (
    code: string,
    deviceId: string,
    deviceName?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
      // Generate key pair
      const keyPair = await generateKeyPair();
      
      const response = await fetch(`${PAIRING_SERVER_URL}/api/pairing/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          deviceId,
          type: 'mobile',
          name: deviceName || 'Mobile Device',
          os: getOS(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Pairing failed');
      }

      const data = await response.json();
      
      setResult({
        success: true,
        userId: data.userId,
        anonymousId: data.anonymousId,
        pairedDeviceId: data.pairedDeviceId,
      });

      // TODO: Store keys and user info securely
      // await SecureStore.setItemAsync('userId', data.userId);
      // await SecureStore.setItemAsync('privateKey', arrayBufferToBase64(keyPair.privateKey));

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Pairing failed',
      });
    } finally {
      setIsPairing(false);
    }
  }, []);

  const pairWithQR = useCallback(async (
    qrData: string,
    deviceId: string,
    deviceName?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
      // Parse QR data (format: did=<deviceId>&pk=<publicKey>&ts=<timestamp>&sig=<signature>)
      const params = new URLSearchParams(qrData);
      const pairedDeviceId = params.get('did');
      const pairedPublicKeyBase64 = params.get('pk');

      if (!pairedDeviceId || !pairedPublicKeyBase64) {
        throw new Error('Invalid QR code');
      }

      // Generate our own key pair
      const keyPair = await generateKeyPair();

      // TODO: Implement direct QR pairing (without code)
      // This requires a different API endpoint for direct pairing

      // For now, fall back to code-based pairing
      // The QR code could contain a short-lived pairing code
      const pairingCode = params.get('code');
      if (pairingCode) {
        await pairWithCode(pairingCode, deviceId, deviceName);
      } else {
        throw new Error('QR code does not contain pairing code');
      }

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'QR pairing failed',
      });
    } finally {
      setIsPairing(false);
    }
  }, [pairWithCode]);

  const reset = useCallback(() => {
    setIsPairing(false);
    setResult(null);
  }, []);

  return {
    isPairing,
    result,
    pairWithCode,
    pairWithQR,
    reset,
  };
}

function getOS(): string {
  // Simple OS detection for mobile
  return 'iOS'; // or 'Android' based on Platform
}
