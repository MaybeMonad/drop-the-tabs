import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3 } from 'lucide-react-native';

export default function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-lg font-semibold text-foreground">Statistics</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="items-center justify-center py-20">
          <BarChart3 size={48} className="text-muted-foreground mb-4" />
          <Text className="text-muted-foreground">No data yet</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
