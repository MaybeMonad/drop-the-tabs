import { useState, useEffect, useCallback } from 'react';
import { database } from '../database';
import type { Tab, Device } from '../database/models';

export function useTabs(deviceId?: string) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tabsCollection = database.get<Tab>('tabs');
    
    let query = tabsCollection.query();
    if (deviceId) {
      query = query.extend('device_id', deviceId);
    }

    const subscription = query.observe().subscribe((data) => {
      setTabs(data);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [deviceId]);

  return { tabs, loading };
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const devicesCollection = database.get<Device>('devices');
    
    const subscription = devicesCollection.query().observe().subscribe((data) => {
      setDevices(data);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { devices, loading };
}

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // This would be connected to your sync adapter
  const checkStatus = useCallback(() => {
    // TODO: Implement sync status check
  }, []);

  return { isOnline, lastSync, checkStatus };
}
