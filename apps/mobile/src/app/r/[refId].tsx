import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { PENDING_REFERRAL_KEY } from '@/constants/sharing';
import { colors } from '@/theme/tokens';

// Entrada de camina://r/<userId> — el link de "invitá amigos" de Perfil.
// Solo aplica a instalaciones nuevas: si ya hay sesión no se puede sumar un
// referido retroactivo, así que simplemente entra a la app.
export default function ReferralLinkScreen() {
  const { refId } = useLocalSearchParams<{ refId: string }>();
  const session = useAuthStore((s) => s.session);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    (async () => {
      if (!session && refId) {
        await AsyncStorage.setItem(PENDING_REFERRAL_KEY, refId);
        router.replace('/(auth)/welcome');
      } else {
        router.replace(session ? '/(tabs)' : '/(auth)/welcome');
      }
    })();
  }, [refId, session]);

  return (
    <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
      <ActivityIndicator color={colors.aqua} />
    </View>
  );
}
