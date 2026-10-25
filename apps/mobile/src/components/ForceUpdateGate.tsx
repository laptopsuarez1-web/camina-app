import { useEffect, useState, type ReactNode } from 'react';
import { View, Linking, Platform, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

// Compara versiones "1.2.3" → -1 / 0 / 1.
function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Si la versión instalada es menor que la mínima cargada en app_config, se
// bloquea la app con un aviso amable para actualizar. Si no hay conexión o la
// tabla no responde, la app funciona normal (nunca bloquea por error).
export function ForceUpdateGate({ children }: { children: ReactNode }) {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const current = Constants.expoConfig?.version ?? '0.0.0';
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', [`min_version_${platform}`, `store_url_${platform}`])
      .then(({ data, error }) => {
        if (error || !data) return;
        const min = data.find((r) => r.key === `min_version_${platform}`)?.value;
        const url = data.find((r) => r.key === `store_url_${platform}`)?.value;
        if (url) setStoreUrl(url);
        if (min && compareVersions(current, min) < 0) setBlocked(true);
      });
  }, []);

  if (!blocked) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.authBg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 12 }} />
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
        ¡Hay una versión nueva de Camina!
      </Text>
      <Text style={{ color: '#B7A9E0', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 26 }}>
        Actualiza la app para seguir sumando Puntos con tus pasos. Es rapidito.
      </Text>
      {storeUrl ? (
        <Press
          accessibilityRole="button"
          onPress={() => Linking.openURL(storeUrl)}
          style={{ backgroundColor: colors.mint, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: colors.authBg, fontWeight: '800', fontSize: 15 }}>Actualizar ahora</Text>
        </Press>
      ) : null}
    </View>
  );
}
