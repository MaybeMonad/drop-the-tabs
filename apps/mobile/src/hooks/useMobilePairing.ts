import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { getFirebaseUrl, type BackendConfig } from '../config/backend';

const PAIRING_SERVER_URL = 'http://localhost:3000';

interface PairingResult {
  success: boolean;
  userId?: string;
  anonymousId?: string;
  pairedDeviceId?: string;
  error?: string;
}

interface UseMobilePairingReturn {
  isPairing: boolean;
  result: PairingResult | null;
  pairWithCode: (code: string, deviceId: string, deviceName?: string, backendUrl?: string) => Promise<void>;
  pairWithQR: (qrData: string, deviceId: string, deviceName?: string, backendUrl?: string) => Promise<void>;
  reset: () => void;
}

export function useMobilePairing(): UseMobilePairingReturn {
  const [isPairing, setIsPairing] = useState(false);
  const [result, setResult] = useState<PairingResult | null>(null);
  const { setUserId, setDeviceId, setSyncConfig } = useAppStore();

  const pairWithCode = useCallback(async (
    code: string,
    deviceId: string,
    deviceName?: string,
    backendUrl?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    const apiUrl = backendUrl || PAIRING_SERVER_URL;

    try {
      const response = await fetch(`${apiUrl}/pairing/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          deviceId,
          type: 'mobile',
          name: deviceName || 'Mobile Device',
          os: 'iOS',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Pairing failed');
      }

      const data = await response.json();
      
      setUserId(data.userId);
      setDeviceId(deviceId);
      
      // Auto-configure sync
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws';
      setSyncConfig({
        type: apiUrl.includes('firebase') ? 'firebase' : 'custom',
        httpEndpoint: apiUrl,
        wsEndpoint: wsUrl,
      });
      
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
  }, [setUserId, setDeviceId, setSyncConfig]);

  const pairWithQR = useCallback(async (
    qrData: string,
    deviceId: string,
    deviceName?: string,
    backendUrl?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
      const params = new URLSearchParams(qrData);
      const pairingCode = params.get('code');
      
      // Try to extract backend URL from QR if present
      const qrBackendUrl = params.get('api') || backendUrl;
      
      if (pairingCode) {
        await pairWithCode(pairingCode, deviceId, deviceName, qrBackendUrl);
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
