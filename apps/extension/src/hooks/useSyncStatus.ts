import { useState, useEffect } from 'react';

interface SyncStatus {
  connected: boolean;
  userId: string | null;
  deviceId: string | null;
  lastSync: number | null;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    userId: null,
    deviceId: null,
    lastSync: null,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
        if (response?.success) {
          setStatus({
            connected: response.connected,
            userId: response.userId,
            deviceId: response.deviceId,
            lastSync: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to get sync status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // 每5秒检查一次

    return () => clearInterval(interval);
  }, []);

  return status;
}
