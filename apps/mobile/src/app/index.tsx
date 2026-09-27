import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { ONBOARDING_SEEN_KEY } from '@/constants/onboarding';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { session, profile, initializing } = useAuthStore();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY).then((v) => setOnboardingSeen(v === '1'));
  }, []);

  if (initializing || onboardingSeen === null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} />
      </View>
    );
  }

  if (!onboardingSeen) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile || !profile.full_name.trim()) return <Redirect href="/(auth)/perfil" />;
  return <Redirect href="/(tabs)" />;
}
