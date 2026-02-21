import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '../stores/appStore';
import type { Tab } from '../database/models';

interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

interface WebSocketMessage {
  type: 'handshake' | 'sync' | 'ping' | 'pong' | 'error' | 'ack';
  payload?: any;
  timestamp: number;
  deviceId?: string;
}

export function useRealtimeSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    syncing: false,
    lastSync: null,
    error: null,
  });
  const [remoteTabs, setRemoteTabs] = useState<Tab[]>([]);
  
  const { syncConfig, userId, deviceId } = useAppStore();
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!syncConfig || !userId || !deviceId) {
      console.log('[RealtimeSync] Missing config, skipping connection');
      return;
    }

    const wsEndpoint = syncConfig.wsEndpoint || 'ws://localhost:3000/ws';
    const wsUrl = `${wsEndpoint}?userId=${userId}&deviceId=${deviceId}`;

    console.log('[RealtimeSync] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[RealtimeSync] Connected');
        setStatus(prev => ({ ...prev, connected: true, error: null }));
        reconnectAttemptsRef.current = 0;
        
        // Send handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          payload: { deviceId, platform: Platform.OS },
          timestamp: Date.now(),
        }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[RealtimeSync] Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[RealtimeSync] Disconnected');
        setStatus(prev => ({ ...prev, connected: false }));
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnect
        if (reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * reconnectAttemptsRef.current, 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[RealtimeSync] Reconnecting...');
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[RealtimeSync] Error:', error);
        setStatus(prev => ({ 
          ...prev, 
          error: 'Connection error',
          connected: false 
        }));
      };

    } catch (error) {
      console.error('[RealtimeSync] Failed to connect:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: 'Failed to connect',
        connected: false 
      }));
    }
  }, [syncConfig, userId, deviceId]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'handshake':
        console.log('[RealtimeSync] Handshake completed');
        break;

      case 'sync':
        setStatus(prev => ({ ...prev, syncing: true }));
        
        if (message.payload?.tabs) {
          setRemoteTabs(message.payload.tabs);
        }
        
        setStatus(prev => ({ 
          ...prev, 
          syncing: false,
          lastSync: Date.now() 
        }));
        break;

      case 'pong':
        // Keep alive acknowledged
        break;

      case 'error':
        console.error('[RealtimeSync] Server error:', message.payload);
        setStatus(prev => ({ 
          ...prev, 
          error: message.payload?.message || 'Unknown error' 
        }));
        break;
    }
  }, []);

  const sendTabUpdate = useCallback((tabs: Tab[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[RealtimeSync] Not connected, cannot send update');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'sync',
      payload: { tabs },
      timestamp: Date.now(),
      deviceId,
    }));
  }, [deviceId]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus({
      connected: false,
      syncing: false,
      lastSync: null,
      error: null,
    });
  }, []);

  // Connect on mount/config change
  useEffect(() => {
    if (syncConfig && userId && deviceId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [syncConfig, userId, deviceId, connect, disconnect]);

  return {
    status,
    remoteTabs,
    sendTabUpdate,
    connect,
    disconnect,
  };
}
