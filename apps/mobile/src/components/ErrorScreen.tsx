import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BaifoMascot } from '@/components/ui/BaifoMascot';
import { Sentry } from '@/lib/monitoring';
import { isNetworkError } from '@/lib/connection';
import { colors } from '@/theme/tokens';

// Pantalla de "algo salió mal": aparece si una pantalla falla al dibujarse, en vez de cerrarse la app o quedar en blanco.
// Expo Router la usa cuando un layout exporta `ErrorBoundary`. El error se manda a Sentry.
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  const offline = isNetworkError(error);
  return (
    <View style={{ flex: 1, backgroundColor: colors.authBg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <BaifoMascot pose="confundido" height={150} />
      <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 20 }}>
        {offline ? 'Nos quedamos sin conexión' : 'El Baifo se tropezó'}
      </Text>
      <Text style={{ color: colors.authMuted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
        {offline ? 'Revisa tu internet y vuelve a intentar.' : 'Algo salió mal en esta pantalla. Tus pasos y tus Puntos están a salvo.'}
      </Text>
      <Press accessibilityRole="button" haptic="light" onPress={() => { retry(); }} style={{ marginTop: 26, backgroundColor: colors.mint, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 34 }}>
        <Text style={{ color: colors.mintDark, fontSize: 15.5, fontWeight: '800' }}>Reintentar</Text>
      </Press>
      <Press accessibilityRole="button" onPress={() => { router.replace('/'); retry(); }} style={{ marginTop: 6, paddingVertical: 12, paddingHorizontal: 20 }}>
        <Text style={{ color: colors.authMuted, fontSize: 14, fontWeight: '700' }}>Ir a Inicio</Text>
      </Press>
    </View>
  );
}
