import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Redirect, router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthLinkStatus } from '@/lib/auth-links';
import { colors } from '@/theme/tokens';

// A donde apuntan los links de confirmación/recuperación de Supabase (emailRedirectUrl() en lib/auth-links.ts).
// El intercambio del link lo hace lib/auth-links.ts y deja su resultado en useAuthLinkStatus; esta pantalla
// solo lo muestra. Nunca queda en blanco ni esperando para siempre: o entra, o dice qué pasó y qué hacer.
export default function AuthCallbackScreen() {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const status = useAuthLinkStatus((s) => s.status);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, []);

  const failed = status.state === 'error' || (timedOut && !initializing && !session);

  if (session && !failed && status.state !== 'working') {
    // Link de "olvidé mi contraseña": directo al formulario para elegir la nueva.
    if (passwordRecovery || (status.state === 'done' && status.recovery)) {
      return <Redirect href="/(tabs)/editar-perfil?nueva=1" />;
    }
    return <Redirect href="/" />;
  }

  if (failed) {
    const message = status.state === 'error' ? status.message : 'No pudimos confirmar el link. Pide uno nuevo e inténtalo otra vez.';
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark px-8">
        <Text accessibilityRole="header" className="text-text-light dark:text-text-dark text-[17px] font-bold text-center mb-2">
          No se pudo abrir el link
        </Text>
        <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center mb-6">{message}</Text>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Ir a iniciar sesión"
          onPress={() => router.replace(session ? '/' : '/(auth)/welcome')}
          style={{ backgroundColor: colors.mint, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 }}
        >
          <Text style={{ color: colors.mintDark, fontWeight: '700', fontSize: 15 }}>{session ? 'Continuar' : 'Ir a iniciar sesión'}</Text>
        </Press>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark px-8">
      <ActivityIndicator accessibilityLabel="Cargando" color={colors.aqua} />
      <Text className="text-muted-light dark:text-muted-dark text-[13px] mt-4 text-center">Confirmando tu cuenta…</Text>
    </View>
  );
}
