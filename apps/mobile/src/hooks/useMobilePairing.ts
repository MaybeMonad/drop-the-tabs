import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

const PAIRING_SERVER_URL = 'http://localhost:3000';

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
  const { setUserId, setDeviceId } = useAppStore();

  const pairWithCode = useCallback(async (
    code: string,
    deviceId: string,
    deviceName?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
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
      
      // Save to store
      setUserId(data.userId);
      setDeviceId(deviceId);
      
      setResult({
        success: true,
        userId: data.userId,
        anonymousId: data.anonymousId,
        pairedDeviceId: data.pairedDeviceId,
      });

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Pairing failed',
      });
    } finally {
      setIsPairing(false);
    }
  }, [setUserId, setDeviceId]);

  const pairWithQR = useCallback(async (
    qrData: string,
    deviceId: string,
    deviceName?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
      // Parse QR data
      const params = new URLSearchParams(qrData);
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
  return 'iOS';
}
