import { useState, useEffect, useCallback } from 'react';
import {
  generateKeyPair,
  generateQRCodePayload,
  createPairingSession,
  arrayBufferToBase64,
} from '@drop-the-tabs/shared-api';
import type { PairingState, PairingSession } from '@drop-the-tabs/shared-api';
import { loadBackendConfig, type BackendConfig } from '../config/backend';

interface UsePairingOptions {
  deviceId: string;
  deviceName?: string;
}

interface UsePairingReturn {
  state: PairingState;
  qrCode: string | null;
  pairingCode: string | null;
  backendConfig: BackendConfig | null;
  generate: () => Promise<void>;
  cancel: () => void;
  refreshBackend: () => Promise<void>;
}

export function usePairing(options: UsePairingOptions): UsePairingReturn {
  const { deviceId, deviceName } = options;
  
  const [state, setState] = useState<PairingState>({ type: 'idle' });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<any>(null);
  const [session, setSession] = useState<PairingSession | null>(null);
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);

  // Load backend config on mount
  useEffect(() => {
    loadBackendConfig().then(setBackendConfig);
  }, []);

  const refreshBackend = useCallback(async () => {
    const config = await loadBackendConfig();
    setBackendConfig(config);
  }, []);

  // Generate pairing session
  const generate = useCallback(async () => {
    if (!backendConfig) {
      setState({ type: 'error', error: 'Backend not configured' });
      return;
    }

    setState({ type: 'generating' });
    
    try {
      // Generate key pair
      const kp = await generateKeyPair();
      setKeyPair(kp);
      
      // Create pairing session
      const newSession = createPairingSession(deviceId, kp, 5);
      setSession(newSession);
      
      // Generate QR code payload with server URL
      const qrPayload = generateQRCodePayload({
        did: deviceId,
        pk: kp.publicKey,
        ts: Date.now(),
        // Include code endpoint in QR for mobile
        code: '', // Will be filled after getting from server
      });
      setQrCode(qrPayload);
      
      // Generate 6-digit pairing code via API
      const serverUrl = backendConfig.apiUrl;
      const response = await fetch(`${serverUrl}/pairing/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          publicKey: arrayBufferToBase64(kp.publicKey),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate pairing code');
      }
      
      const { code } = await response.json();
      setPairingCode(code);
      
      // Update QR with code
      const updatedQrPayload = generateQRCodePayload({
        did: deviceId,
        pk: kp.publicKey,
        ts: Date.now(),
        code,
      });
      setQrCode(updatedQrPayload);
      
      // Update state
      setState({ type: 'waiting', session: newSession });
      
      // Start polling for pairing status
      startPolling(code, serverUrl);
      
    } catch (error) {
      setState({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [deviceId, deviceName, backendConfig]);

  // Poll for pairing status
  const startPolling = useCallback((code: string, serverUrl: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${serverUrl}/pairing/status/${code}`);
        const data = await response.json();
        
        if (data.paired) {
          clearInterval(interval);
          // Pairing completed
          setState(prev => {
            if (prev.type === 'waiting') {
              return {
                type: 'completed',
                result: {
                  success: true,
                  userId: data.userId,
                  anonymousId: data.anonymousId,
                  pairedDeviceId: data.deviceId,
                },
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setState(prev => {
        if (prev.type === 'waiting') {
          return { type: 'error', error: 'Pairing timeout' };
        }
        return prev;
      });
    }, 5 * 60 * 1000);
  }, []);

  // Cancel pairing
  const cancel = useCallback(() => {
    setState({ type: 'idle' });
    setQrCode(null);
    setPairingCode(null);
    setSession(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    state,
    qrCode,
    pairingCode,
    backendConfig,
    generate,
    cancel,
    refreshBackend,
  };
}
