import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ONBOARDING, ONBOARDING_SEEN_KEY } from '@/constants/onboarding';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const current = ONBOARDING[step];

  async function next() {
    if (step < ONBOARDING.length - 1) {
      setStep(step + 1);
      return;
    }
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/(auth)/welcome');
  }

  async function skip() {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/(auth)/welcome');
  }

  return (
    <View className="flex-1 bg-auth-bg justify-between items-center px-6 py-5">
      <Pressable onPress={skip} className="self-end">
        <Text className="text-auth-muted text-[13px]">Saltar</Text>
      </Pressable>

      <View className="items-center max-w-[300px]">
        <Image source={require('@/../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 24 }} />
        <Text className="text-white text-[22px] font-semibold text-center mb-2.5">{current.title}</Text>
        <Text className="text-auth-muted text-sm text-center leading-5">{current.desc}</Text>
      </View>

      <View className="w-full max-w-[320px]">
        <View className="flex-row justify-center gap-1.5 mb-5">
          {ONBOARDING.map((_, i) => (
            <View
              key={i}
              className="h-1.5 rounded-full"
              style={{ width: i === step ? 20 : 6, backgroundColor: i === step ? '#7FEDC4' : '#2F1E5C' }}
            />
          ))}
        </View>
        <Pressable onPress={next} className="bg-mint rounded-xl py-3.5 items-center">
          <Text className="text-mint-dark font-semibold">
            {step < ONBOARDING.length - 1 ? 'Siguiente' : 'Empezar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
