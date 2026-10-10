import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { ONBOARDING_SEEN_KEY } from '@/constants/onboarding';
import { ProfileRetry } from '@/components/ProfileRetry';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { session, profile, profileError, initializing } = useAuthStore();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setOnboardingSeen(v === '1'))
      // Si no se puede leer, seguimos de largo en vez de dejar el spinner para siempre.
      .catch(() => setOnboardingSeen(true));
  }, []);

  if (initializing || onboardingSeen === null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator accessibilityLabel="Cargando" color={colors.aqua} />
      </View>
    );
  }

  if (!onboardingSeen) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  // No pudimos leer el perfil (no es lo mismo que "no existe"): reintentar en vez de mandar al alta.
  if (!profile && profileError) return <ProfileRetry />;
  if (!profile || !profile.full_name.trim()) return <Redirect href="/(auth)/perfil" />;
  if (!profile.terms_accepted_at) return <Redirect href="/(auth)/terminos" />;
  return <Redirect href="/(tabs)" />;
}
