import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Keyboard } from 'lucide-react-native';

export default function ScanScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-foreground text-center">
          Pair Device
        </Text>
        <View className="w-8" />
      </View>

      {/* Scan Options */}
      <View className="flex-1 p-4">
        <View className="flex-1 gap-4">
          <TouchableOpacity className="flex-1 bg-card rounded-2xl items-center justify-center p-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Camera size={32} className="text-primary" />
            </View>
            <Text className="text-xl font-semibold text-foreground mb-2">Scan QR Code</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Point your camera at the QR code displayed in your browser extension
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 bg-card rounded-2xl items-center justify-center p-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Keyboard size={32} className="text-primary" />
            </View>
            <Text className="text-xl font-semibold text-foreground mb-2">Enter Pairing Code</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Type the 6-digit code shown in your browser extension
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
