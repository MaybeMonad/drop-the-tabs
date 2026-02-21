import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Server } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMobilePairing } from '../../src/hooks/useMobilePairing';
import { useAppStore } from '../../src/stores/appStore';
import { getFirebaseUrl } from '../../src/config/backend';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [localDeviceId, setLocalDeviceId] = useState('');
  const [backendUrl, setBackendUrl] = useState(getFirebaseUrl());
  const [showBackendInput, setShowBackendInput] = useState(false);
  const { isPairing, result, pairWithQR } = useMobilePairing();
  const { setDeviceId } = useAppStore();

  useEffect(() => {
    if (permission?.granted) {
      setScanning(true);
    }
  }, [permission]);

  useEffect(() => {
    const id = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setLocalDeviceId(id);
    setDeviceId(id);
  }, [setDeviceId]);

  useEffect(() => {
    if (result?.success) {
      Alert.alert(
        'Pairing Successful',
        'Your device is now connected!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } else if (result?.error) {
      Alert.alert('Pairing Failed', result.error);
      setScanning(true);
    }
  }, [result, router]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isPairing) return;
    setScanning(false);
    pairWithQR(data, localDeviceId, 'Mobile Device', backendUrl);
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="text-foreground mt-4">Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background p-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground text-lg mb-4 text-center">Camera access is needed</Text>
          <TouchableOpacity onPress={requestPermission} className="bg-primary px-6 py-3 rounded-lg">
            <Text className="text-primary-foreground font-medium">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-black/50 rounded-full">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-semibold">Scan QR Code</Text>
        
        <TouchableOpacity onPress={() => setShowBackendInput(!showBackendInput)} className="p-2 bg-black/50 rounded-full">
          <Server size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Backend URL Input */}
      {showBackendInput && (
        <View className="absolute top-20 left-4 right-4 z-20 bg-card p-4 rounded-xl">
          <Text className="text-sm font-medium text-foreground mb-2">Backend URL</Text>
          <TextInput
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://..."
            className="bg-background px-3 py-2 rounded-lg text-foreground"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity 
              onPress={() => setBackendUrl(getFirebaseUrl())}
              className="flex-1 bg-primary/10 px-3 py-2 rounded-lg"
            >
              <Text className="text-primary text-center text-sm">Firebase Default</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setBackendUrl('http://localhost:3000')}
              className="flex-1 bg-muted px-3 py-2 rounded-lg"
            >
              <Text className="text-muted-foreground text-center text-sm">Localhost</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Camera */}
      {scanning && !isPairing ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white mt-4">{isPairing ? 'Pairing...' : 'Processing...'}</Text>
        </View>
      )}

      {/* Scanner Overlay */}
      <View className="absolute inset-0 pointer-events-none">
        <View className="absolute top-1/4 left-8 right-8 aspect-square">
          <View className="absolute inset-0 border-2 border-white/30 rounded-3xl" />
          <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
          <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
          <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
          <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
        </View>
      </View>

      {/* Bottom */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
        <Text className="text-white/70 text-center mb-4">Point camera at QR code in browser extension</Text>
        
        <TouchableOpacity onPress={() => router.push('/pair-code')} className="bg-white/20 px-6 py-4 rounded-xl">
          <Text className="text-white font-medium text-center">Enter Pairing Code Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
