import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import { generatePairingCode, isValidPairingCode } from '@drop-the-tabs/shared-api';
import { useAppStore } from '../src/stores/appStore';

export default function PairCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { setSyncConfig } = useAppStore();

  const handleDigitPress = (digit: string) => {
    const currentIndex = code.findIndex(c => c === '');
    if (currentIndex === -1) return;

    const newCode = [...code];
    newCode[currentIndex] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (currentIndex < 5) {
      inputRefs.current[currentIndex + 1]?.focus();
    }
  };

  const handleDelete = () => {
    const lastFilledIndex = code.map(c => c !== '').lastIndexOf(true);
    if (lastFilledIndex === -1) return;

    const newCode = [...code];
    newCode[lastFilledIndex] = '';
    setCode(newCode);

    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleSubmit = async () => {
    const fullCode = code.join('');
    
    if (!isValidPairingCode(fullCode)) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement pairing with 6-digit code
      console.log('Pairing with code:', fullCode);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'Device paired successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Pairing Failed', 'Could not find device with this code');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = code.every(c => c !== '');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} className="text-foreground" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-foreground text-center">
            Enter Pairing Code
          </Text>
          <View className="w-8" />
        </View>

        <View className="flex-1 p-6">
          {/* Instructions */}
          <Text className="text-center text-muted-foreground mb-8">
            Enter the 6-digit code displayed in your browser extension
          </Text>

          {/* Code Display */}
          <View className="flex-row justify-center gap-3 mb-8">
            {code.map((digit, index) => (
              <View
                key={index}
                className={`w-14 h-16 rounded-xl border-2 items-center justify-center ${
                  digit ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
              >
                <Text className="text-2xl font-bold text-foreground">
                  {digit || '•'}
                </Text>
              </View>
            ))}
          </View>

          {/* Hidden Inputs for Auto-fill */}
          <View className="flex-row justify-center">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={el => inputRefs.current[index] = el}
                value={digit}
                onChangeText={(text) => {
                  if (text.length === 1) {
                    handleDigitPress(text);
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                className="w-14 h-16 text-center text-2xl font-bold text-foreground absolute opacity-0"
                style={{ left: index * 62 + 24 }}
              />
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isComplete || loading}
            className={`py-4 rounded-xl items-center ${
              isComplete ? 'bg-primary' : 'bg-muted'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`font-semibold ${
                isComplete ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}>
                Pair Device
              </Text>
            )}
          </TouchableOpacity>

          {/* Keypad */}
          <View className="flex-1 justify-end">
            <View className="flex-row flex-wrap justify-center gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleDigitPress(num.toString())}
                  className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted"
                >
                  <Text className="text-2xl font-semibold text-foreground">{num}</Text>
                </TouchableOpacity>
              ))}
              
              <View className="w-24 h-16" />
              
              <TouchableOpacity
                onPress={() => handleDigitPress('0')}
                className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted"
              >
                <Text className="text-2xl font-semibold text-foreground">0</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleDelete}
                className="w-24 h-16 bg-card rounded-xl items-center justify-center active:bg-muted"
              >
                <Delete size={24} className="text-foreground" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
