import { useState, useEffect, useCallback } from 'react';
import {
  generateKeyPair,
  generateQRCodePayload,
  generatePairingCode,
  createPairingSession,
  pairingReducer,
  arrayBufferToBase64,
} from '@drop-the-tabs/shared-api';
import type { PairingState, PairingEvent, PairingSession } from '@drop-the-tabs/shared-api';
import { CustomAdapter } from '@drop-the-tabs/shared-api';
import type { AdapterConfig } from '@drop-the-tabs/shared-core';

const PAIRING_SERVER_URL = process.env.NEXT_PUBLIC_SYNC_SERVER_URL || 'http://localhost:3000';

interface UsePairingOptions {
  deviceId: string;
  deviceName?: string;
  serverUrl?: string;
}

interface UsePairingReturn {
  state: PairingState;
  qrCode: string | null;
  pairingCode: string | null;
  generate: () => Promise<void>;
  cancel: () => void;
  acceptPairing: (request: any) => Promise<void>;
  rejectPairing: (reason: string) => void;
}

export function usePairing(options: UsePairingOptions): UsePairingReturn {
  const { deviceId, deviceName, serverUrl = PAIRING_SERVER_URL } = options;
  
  const [state, setState] = useState<PairingState>({ type: 'idle' });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<any>(null);
  const [session, setSession] = useState<PairingSession | null>(null);

  // Generate pairing session
  const generate = useCallback(async () => {
    setState({ type: 'generating' });
    
    try {
      // Generate key pair
      const kp = await generateKeyPair();
      setKeyPair(kp);
      
      // Create pairing session
      const newSession = createPairingSession(deviceId, kp, 5);
      setSession(newSession);
      
      // Generate QR code payload
      const qrPayload = generateQRCodePayload({
        did: deviceId,
        pk: kp.publicKey,
        ts: Date.now(),
      });
      setQrCode(qrPayload);
      
      // Generate 6-digit pairing code via API
      const response = await fetch(`${serverUrl}/api/pairing/code`, {
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
      
      // Update state
      setState({ type: 'waiting', session: newSession });
      
      // Start polling for pairing status
      startPolling(code);
      
    } catch (error) {
      setState({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, [deviceId, deviceName, serverUrl]);

  // Poll for pairing status
  const startPolling = useCallback((code: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${serverUrl}/api/pairing/status/${code}`);
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
  }, [serverUrl]);

  // Cancel pairing
  const cancel = useCallback(() => {
    setState({ type: 'idle' });
    setQrCode(null);
    setPairingCode(null);
    setSession(null);
  }, []);

  // Accept pairing request
  const acceptPairing = useCallback(async (request: any) => {
    // TODO: Implement acceptance logic
    // This would exchange keys and complete the pairing
  }, []);

  // Reject pairing request
  const rejectPairing = useCallback((reason: string) => {
    setState({ type: 'error', error: reason });
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
    generate,
    cancel,
    acceptPairing,
    rejectPairing,
  };
}
