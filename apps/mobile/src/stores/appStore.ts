import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Device, Tab, Session, AdapterConfig } from '@drop-the-tabs/shared-core';

interface AppState {
  // Sync
  syncConfig: AdapterConfig | null;
  userId: string | null;
  deviceId: string | null;
  isConnected: boolean;
  isUsingFallback: boolean;
  setSyncConfig: (config: AdapterConfig | null) => void;
  setUserId: (userId: string | null) => void;
  setDeviceId: (deviceId: string | null) => void;
  setConnectionStatus: (connected: boolean, fallback?: boolean) => void;

  // Devices
  devices: Device[];
  currentDevice: Device | null;
  selectedDeviceId: string | null;
  setDevices: (devices: Device[]) => void;
  setCurrentDevice: (device: Device) => void;
  selectDevice: (deviceId: string) => void;

  // Tabs
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => void;

  // Sessions
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;

  // UI
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Sync
      syncConfig: null,
      userId: null,
      deviceId: null,
      isConnected: false,
      isUsingFallback: false,
      setSyncConfig: (config) => set({ syncConfig: config }),
      setUserId: (userId) => set({ userId }),
      setDeviceId: (deviceId) => set({ deviceId }),
      setConnectionStatus: (connected, fallback = false) => 
        set({ isConnected: connected, isUsingFallback: fallback }),

      // Devices
      devices: [],
      currentDevice: null,
      selectedDeviceId: null,
      setDevices: (devices) => set({ devices }),
      setCurrentDevice: (device) => set({ currentDevice: device }),
      selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

      // Tabs
      tabs: [],
      setTabs: (tabs) => set({ tabs }),

      // Sessions
      sessions: [],
      setSessions: (sessions) => set({ sessions }),

      // UI
      isLoading: false,
      error: null,
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'drop-the-tabs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        syncConfig: state.syncConfig,
        userId: state.userId,
        deviceId: state.deviceId,
        selectedDeviceId: state.selectedDeviceId,
      }),
    }
  )
);
