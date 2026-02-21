import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, ChevronRight, QrCode, Server, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-lg font-semibold text-foreground">Settings</Text>
      </View>

      <ScrollView className="flex-1">
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

          <TouchableOpacity className="flex-row items-center justify-between p-4 bg-card rounded-xl">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                <Server size={20} className="text-primary" />
              </View>
              <View>
                <Text className="font-medium text-foreground">Backend</Text>
                <Text className="text-sm text-muted-foreground">Firebase (default)</Text>
              </View>
            </View>
            <ChevronRight size={20} className="text-muted-foreground" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View className="p-4">
          <Text className="text-xs font-medium text-muted-foreground uppercase mb-3">About</Text>
          
          <View className="p-4 bg-card rounded-xl">
            <View className="flex-row items-center gap-2 mb-2">
              <Info size={16} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">Drop The Tabs v0.1.0</Text>
            </View>
            <Text className="text-sm text-muted-foreground">MIT License</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
