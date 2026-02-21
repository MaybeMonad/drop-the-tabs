import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Settings, ChevronRight, QrCode, Server, Info, Check } from 'lucide-react-native';
import { useAppStore } from '../../src/stores/appStore';
import { BACKEND_CONFIGS, getFirebaseUrl, type BackendType, type BackendConfig } from '../../src/config/backend';

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    syncConfig, 
    setSyncConfig, 
    setUserId, 
    setDeviceId,
    userId 
  } = useAppStore();

  const [selectedBackend, setSelectedBackend] = useState<BackendType>('firebase');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showBackendSettings, setShowBackendSettings] = useState(false);

  useEffect(() => {
    // Load current config
    if (syncConfig) {
      if (syncConfig.type === 'firebase') {
        setSelectedBackend('firebase');
        const match = syncConfig.httpEndpoint?.match(/us-central1-([^.]+)/);
        if (match) setFirebaseProjectId(match[1]);
      } else {
        setSelectedBackend('custom');
        setCustomUrl(syncConfig.httpEndpoint || '');
      }
    }
  }, [syncConfig]);

  const saveBackendConfig = () => {
    let newConfig: BackendConfig;

    if (selectedBackend === 'firebase') {
      newConfig = {
        ...BACKEND_CONFIGS.firebase,
        apiUrl: getFirebaseUrl(firebaseProjectId || 'drop-the-tabs-prod'),
      };
    } else {
      newConfig = {
        ...BACKEND_CONFIGS.custom,
        apiUrl: customUrl || 'http://localhost:3000',
        wsUrl: (customUrl || 'http://localhost:3000').replace('http', 'ws') + '/ws',
      };
    }

    setSyncConfig({
      type: selectedBackend,
      httpEndpoint: newConfig.apiUrl,
      wsEndpoint: newConfig.wsUrl,
    });

    Alert.alert('Saved', 'Backend configuration updated');
    setShowBackendSettings(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to disconnect from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            setUserId(null);
            setDeviceId(null);
            setSyncConfig(null);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-lg font-semibold text-foreground">Settings</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Connection Status */}
        <View className="p-4">
          <Text className="text-xs font-medium text-muted-foreground uppercase mb-3">Status</Text>
          
          <View className="p-4 bg-card rounded-xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className={`w-3 h-3 rounded-full ${userId ? 'bg-green-500' : 'bg-gray-400'}`} />
                <View>
                  <Text className="font-medium text-foreground">
                    {userId ? 'Connected' : 'Not Connected'}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {userId ? `User: ${userId.slice(0, 8)}...` : 'Pair with a browser to sync'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Pair Device Section */}
        <View className="p-4">
          <Text className="text-xs font-medium text-muted-foreground uppercase mb-3">Connection</Text>
          
          <TouchableOpacity 
            onPress={() => router.push('/scan')}
            className="flex-row items-center justify-between p-4 bg-card rounded-xl mb-2"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                <QrCode size={20} className="text-primary" />
              </View>
              <View>
                <Text className="font-medium text-foreground">Pair New Device</Text>
                <Text className="text-sm text-muted-foreground">Scan QR code or enter pairing code</Text>
              </View>
            </View>
            <ChevronRight size={20} className="text-muted-foreground" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowBackendSettings(!showBackendSettings)}
            className="flex-row items-center justify-between p-4 bg-card rounded-xl"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                <Server size={20} className="text-primary" />
              </View>
              <View>
                <Text className="font-medium text-foreground">Backend</Text>
                <Text className="text-sm text-muted-foreground">
                  {syncConfig?.type === 'firebase' ? 'Firebase Cloud' : 'Self-Hosted'}
                </Text>
              </View>
            </View>
            <ChevronRight 
              size={20} 
              className={`text-muted-foreground transition-transform ${showBackendSettings ? 'rotate-90' : ''}`} 
            />
          </TouchableOpacity>

          {/* Backend Settings Expandable */}
          {showBackendSettings && (
            <View className="mt-2 p-4 bg-card rounded-xl">
              <Text className="font-medium text-foreground mb-3">Select Backend</Text>
              
              {(Object.keys(BACKEND_CONFIGS) as BackendType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedBackend(type)}
                  className={`flex-row items-center gap-3 p-3 rounded-lg mb-2 ${
                    selectedBackend === type ? 'bg-primary/10' : 'bg-background'
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedBackend === type ? 'border-primary' : 'border-gray-400'
                  }`}>
                    {selectedBackend === type && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </View>
                  <View>
                    <Text className="font-medium text-foreground">{BACKEND_CONFIGS[type].name}</Text>
                    <Text className="text-sm text-muted-foreground">{BACKEND_CONFIGS[type].description}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {selectedBackend === 'firebase' && (
                <View className="mt-3">
                  <Text className="text-sm text-muted-foreground mb-2">Firebase Project ID</Text>
                  <TextInput
                    value={firebaseProjectId}
                    onChangeText={setFirebaseProjectId}
                    placeholder="your-project-id"
                    className="px-3 py-2 bg-background rounded-lg text-foreground border border-border"
                  />
                  <Text className="text-xs text-muted-foreground mt-1">
                    {getFirebaseUrl(firebaseProjectId || 'YOUR_PROJECT_ID')}
                  </Text>
                </View>
              )}

              {selectedBackend === 'custom' && (
                <View className="mt-3">
                  <Text className="text-sm text-muted-foreground mb-2">Server URL</Text>
                  <TextInput
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    placeholder="http://localhost:3000"
                    className="px-3 py-2 bg-background rounded-lg text-foreground border border-border"
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={saveBackendConfig}
                className="mt-4 bg-primary py-3 rounded-lg items-center"
              >
                <Text className="text-primary-foreground font-medium">Save Configuration</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        {userId && (
          <View className="p-4">
            <TouchableOpacity
              onPress={handleLogout}
              className="p-4 bg-red-50 rounded-xl"
            >
              <Text className="text-red-600 font-medium text-center">Disconnect Device</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* About Section */}
        <View className="p-4">
          <Text className="text-xs font-medium text-muted-foreground uppercase mb-3">About</Text>
          
          <View className="p-4 bg-card rounded-xl">
            <View className="flex-row items-center gap-2 mb-2">
              <Info size={16} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">Drop The Tabs v0.2.0</Text>
            </View>
            <Text className="text-sm text-muted-foreground">MIT License</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
