import { useState, useCallback } from 'react';
import {
  generateKeyPair,
  generateQRCodePayload,
  createPairingSession,
  arrayBufferToBase64,
} from '@drop-the-tabs/shared-api';
import type { PairingState, PairingSession } from '@drop-the-tabs/shared-api';
import type { BackendConfig } from '../config/backend';

interface UsePairingOptions {
  deviceId: string;
  deviceName?: string;
  backendConfig: BackendConfig;
}

interface UsePairingReturn {
  state: PairingState;
  qrCode: string | null;
  pairingCode: string | null;
  generate: () => Promise<void>;
  cancel: () => void;
  result: { success: boolean; userId?: string; anonymousId?: string } | null;
}

export function usePairing(options: UsePairingOptions): UsePairingReturn {
  const { deviceId, deviceName, backendConfig } = options;
  
  const [state, setState] = useState<PairingState>({ type: 'idle' });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<any>(null);
  const [session, setSession] = useState<PairingSession | null>(null);
  const [result, setResult] = useState<{ success: boolean; userId?: string; anonymousId?: string } | null>(null);

  const apiUrl = backendConfig.apiUrl;

  const generate = useCallback(async () => {
    setState({ type: 'generating' });
    setResult(null);
    
    try {
      const kp = await generateKeyPair();
      setKeyPair(kp);
      
      const newSession = createPairingSession(deviceId, kp, 5);
      setSession(newSession);
      
      const qrPayload = generateQRCodePayload({
        did: deviceId,
        pk: kp.publicKey,
        ts: Date.now(),
      });
      setQrCode(qrPayload);
      
      const response = await fetch(`${apiUrl}/pairing/code`, {
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
      
      setState({ type: 'waiting', session: newSession });
      
      // Start polling
      startPolling(code);
      
    } catch (error) {
      setState({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [deviceId, apiUrl]);

  const startPolling = useCallback((code: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/pairing/status/${code}`);
        const data = await response.json();
        
        if (data.paired) {
          clearInterval(interval);
          setResult({
            success: true,
            userId: data.userId,
            anonymousId: data.anonymousId,
          });
          setState({ type: 'completed', result: { success: true } as any });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      setState(prev => {
        if (prev.type === 'waiting') {
          return { type: 'error', error: 'Pairing timeout' };
        }
        return prev;
      });
    }, 5 * 60 * 1000);
  }, [apiUrl]);

  const cancel = useCallback(() => {
    setState({ type: 'idle' });
    setQrCode(null);
    setPairingCode(null);
    setSession(null);
    setResult(null);
  }, []);

  return {
    state,
    qrCode,
    pairingCode,
    generate,
    cancel,
    result,
  };
}
