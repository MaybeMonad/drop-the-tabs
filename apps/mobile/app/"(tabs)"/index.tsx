import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layers, RefreshCw } from 'lucide-react-native';

export default function TabsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center">
            <Layers size={18} color="white" />
          </View>
          <View>
            <Text className="text-sm font-semibold text-foreground">Drop The Tabs</Text>
            <Text className="text-xs text-muted-foreground">No connected devices</Text>
          </View>
        </View>
        
        <TouchableOpacity className="p-2 rounded-lg">
          <RefreshCw size={20} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      <ScrollView className="flex-1 p-4">
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-4xl mb-4">📱</Text>
          <Text className="text-lg font-medium text-foreground mb-2">Welcome to Drop The Tabs</Text>
          <Text className="text-sm text-muted-foreground text-center mb-6">
            Connect to your browser to start managing tabs remotely
          </Text>
          
          <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg">
            <Text className="text-primary-foreground font-medium">Pair Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
