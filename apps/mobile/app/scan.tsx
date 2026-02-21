import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera as CameraIcon, Keyboard } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect } from 'react';
import { decodeQRCode, extractPublicKeyFromQR } from '@drop-the-tabs/shared-api';
import { useAppStore } from '../../src/stores/appStore';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const { setSyncConfig } = useAppStore();

  useEffect(() => {
    if (permission?.granted) {
      setScanning(true);
    }
  }, [permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    
    try {
      // Decode QR payload
      const payload = decodeQRCode(data);
      const publicKey = extractPublicKeyFromQR(payload);
      
      // TODO: Complete pairing flow
      Alert.alert(
        'Device Found',
        `Device ID: ${payload.did.slice(0, 8)}...\nWould you like to pair?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Pair', 
            onPress: () => completePairing(payload.did, publicKey)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Please scan a valid Drop The Tabs QR code');
      setScanning(true);
    }
  };

  const completePairing = async (deviceId: string, publicKey: Uint8Array) => {
    // TODO: Implement full pairing with key exchange
    console.log('Pairing with device:', deviceId);
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Requesting camera permission...️</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background p-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground text-lg mb-4">Camera permission required</Text>
          <TouchableOpacity 
            onPress={requestPermission}
            className="bg-primary px-6 py-3 rounded-lg"
          >
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
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 bg-black/50 rounded-full"
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-semibold">Scan QR Code</Text>
        
        <View className="w-10" />
      </View>

      {/* Camera */}
      {scanning ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white">Processing...</Text>
        </View>
      )}

      {/* Overlay */}
      <View className="absolute inset-0 pointer-events-none">
        <View className="absolute top-32 left-8 right-8 h-64 border-2 border-white/50 rounded-2xl"
        >
          <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1" />
          <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1" />
          <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1" />
          <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1" />
        </View>
      </View>

      {/* Bottom Options */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
        <TouchableOpacity 
          onPress={() => router.push('/pair-code')}
          className="flex-row items-center justify-center gap-2 bg-white/20 backdrop-blur px-6 py-4 rounded-xl"
        >
          <Keyboard size={20} color="white" />
          <Text className="text-white font-medium">Enter Pairing Code Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
