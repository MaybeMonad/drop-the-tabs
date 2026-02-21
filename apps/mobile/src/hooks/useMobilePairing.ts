import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { getFirebaseUrl, type BackendConfig } from '../config/backend';

const DEFAULT_SERVER_URL = 'http://localhost:3000';

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
  pairWithCode: (code: string, deviceId: string, deviceName?: string, serverUrl?: string) => Promise<void>;
  pairWithQR: (qrData: string, deviceId: string, deviceName?: string) => Promise<void>;
  reset: () => void;
}

export function useMobilePairing(): UseMobilePairingReturn {
  const [isPairing, setIsPairing] = useState(false);
  const [result, setResult] = useState<PairingResult | null>(null);
  const { setUserId, setDeviceId, syncConfig } = useAppStore();

  // Get server URL from config or use default
  const getServerUrl = useCallback((): string => {
    if (syncConfig?.httpEndpoint) {
      return syncConfig.httpEndpoint;
    }
    return DEFAULT_SERVER_URL;
  }, [syncConfig]);

  const pairWithCode = useCallback(async (
    code: string,
    deviceId: string,
    deviceName?: string,
    serverUrl?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    const url = serverUrl || getServerUrl();

    try {
      const response = await fetch(`${url}/pairing/pair`, {
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
  }, [getServerUrl, setUserId, setDeviceId]);

  const pairWithQR = useCallback(async (
    qrData: string,
    deviceId: string,
    deviceName?: string
  ) => {
    setIsPairing(true);
    setResult(null);

    try {
      // Parse QR data - can be URL format or JSON
      let pairingCode: string | null = null;
      let serverUrl: string | null = null;

      // Try to parse as URL params
      if (qrData.includes('?')) {
        const params = new URLSearchParams(qrData.split('?')[1]);
        pairingCode = params.get('code');
        serverUrl = params.get('server');
      }

      // Try to parse as JSON
      if (!pairingCode && qrData.startsWith('{')) {
        try {
          const json = JSON.parse(qrData);
          pairingCode = json.code;
          serverUrl = json.server;
        } catch {
          // Not valid JSON
        }
      }

      // Fallback: try to extract code directly
      if (!pairingCode) {
        const match = qrData.match(/(\d{6})/);
        if (match) {
          pairingCode = match[1];
        }
      }
      
      if (pairingCode) {
        await pairWithCode(pairingCode, deviceId, deviceName, serverUrl || undefined);
      } else {
        throw new Error('Could not find pairing code in QR');
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
