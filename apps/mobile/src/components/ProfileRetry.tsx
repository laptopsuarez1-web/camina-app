import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/theme/tokens';

// Se muestra cuando hay sesión pero no se pudo LEER el perfil (sin red o error del servidor).
// Sirve para no mandar a una persona que ya tiene cuenta al alta, donde pisaría sus datos.
export function ProfileRetry() {
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await useAuthStore.getState().refreshProfile();
    } finally {
      setRetrying(false);
    }
  }

  async function logout() {
    // Solo en este teléfono: el cierre global también sacaba a la persona de la web y de sus otros teléfonos.
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/(auth)/welcome');
  }

  return (
    <View className="flex-1 justify-center bg-bg-light dark:bg-bg-dark px-6">
      <EmptyState title="No pudimos cargar tu perfil" text="Revisa tu conexión e intenta de nuevo." />
      <Press
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        accessibilityState={{ busy: retrying }}
        onPress={retry}
        disabled={retrying}
        style={{ marginTop: 16, backgroundColor: colors.aquaDeep, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
      >
        {retrying ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Reintentar</Text>}
      </Press>
      <Press accessibilityRole="button" onPress={logout} style={{ paddingVertical: 14, alignItems: 'center' }}>
        <Text className="text-aqua-ink dark:text-mint text-[13.5px] font-semibold">Cerrar sesión</Text>
      </Press>
    </View>
  );
}
