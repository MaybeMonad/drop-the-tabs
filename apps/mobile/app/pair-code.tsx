import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import { useMobilePairing } from '../src/hooks/useMobilePairing';
import { useAppStore } from '../src/stores/appStore';

export default function PairCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [localDeviceId, setLocalDeviceId] = useState('');
  const { isPairing, result, pairWithCode } = useMobilePairing();
  const { setSyncConfig, setDeviceId } = useAppStore();

  useEffect(() => {
    const id = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setLocalDeviceId(id);
    setDeviceId(id);
  }, [setDeviceId]);

  useEffect(() => {
    if (result) {
      if (result.success) {
        Alert.alert(
          'Pairing Successful',
          'Your device is now connected!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setSyncConfig({
                  type: 'custom',
                  httpEndpoint: 'http://localhost:3000',
                  wsEndpoint: 'ws://localhost:3000/ws',
                });
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else if (result.error) {
        Alert.alert('Pairing Failed', result.error);
        setCode(['', '', '', '', '', '']);
      }
    }
  }, [result, router, setSyncConfig]);

  const handleDigitPress = (digit: string) => {
    if (isPairing) return;
    const currentIndex = code.findIndex(c => c === '');
    if (currentIndex === -1) return;

    const newCode = [...code];
    newCode[currentIndex] = digit;
    setCode(newCode);

    if (currentIndex === 5) {
      const fullCode = [...newCode].join('');
      handleSubmit(fullCode);
    }
  };

  const handleDelete = () => {
    if (isPairing) return;
    const lastFilledIndex = code.map(c => c !== '').lastIndexOf(true);
    if (lastFilledIndex === -1) return;

    const newCode = [...code];
    newCode[lastFilledIndex] = '';
    setCode(newCode);
  };

  const handleSubmit = (fullCode: string) => {
    if (fullCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code');
      return;
    }
    pairWithCode(fullCode, localDeviceId, 'Mobile Device');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 -ml-2"
          disabled={isPairing}
        >
          <ArrowLeft size={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-foreground text-center">
          Enter Pairing Code
        </Text>
        <View className="w-8" />
      </View>

      <View className="flex-1 p-6">
        <Text className="text-center text-muted-foreground mb-8">
          Enter the 6-digit code from your browser extension
        </Text>

        <View className="flex-row justify-center gap-3 mb-8">
          {code.map((digit, index) => (
            <View
              key={index}
              className={`w-14 h-16 rounded-xl border-2 items-center justify-center ${
                digit ? 'border-primary bg-primary/10' : 'border-border bg-card'
              }`}
            >
              {isPairing && index === code.filter(c => c).length - 1 ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-2xl font-bold text-foreground">
                  {digit || '•'}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View className="flex-1 justify-end">
          <View className="flex-row flex-wrap justify-center gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => handleDigitPress(num.toString())}
                disabled={isPairing}
                className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted disabled:opacity-50"
              >
                <Text className="text-2xl font-semibold text-foreground">{num}</Text>
              </TouchableOpacity>
            ))}
            
            <View className="w-24 h-16" />
            
            <TouchableOpacity
              onPress={() => handleDigitPress('0')}
              disabled={isPairing}
              className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted disabled:opacity-50"
            >
              <Text className="text-2xl font-semibold text-foreground">0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isPairing}
              className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted disabled:opacity-50"
            >
              <Delete size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
