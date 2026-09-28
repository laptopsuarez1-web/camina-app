import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

// A donde apuntan los links de confirmación/recuperación de Supabase
// (emailRedirectUrl() en lib/auth-links.ts). El intercambio real del "code"
// por una sesión lo hace el listener global de app/_layout.tsx — esta
// pantalla solo existe para que Expo Router tenga una ruta real acá (sin
// esto, en la versión web caía en "no encontrado" y el usuario se quedaba
// afuera aunque el login hubiera funcionado). Apenas hay sesión, redirige a
// la raíz, que ya sabe mandar a tabs/perfil/términos según corresponda.
export default function AuthCallbackScreen() {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(id);
  }, []);

  if (session) return <Redirect href="/" />;
  if (timedOut && !initializing) return <Redirect href="/(auth)/welcome" />;

  return (
    <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark px-8">
      <ActivityIndicator color={colors.aqua} />
      <Text className="text-muted-light dark:text-muted-dark text-[13px] mt-4 text-center">
        Confirmando tu cuenta…
      </Text>
    </View>
  );
}
