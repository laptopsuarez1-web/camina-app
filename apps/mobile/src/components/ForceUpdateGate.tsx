import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

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
    <View style={{ flex: 1, backgroundColor: '#241748', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 44, marginBottom: 12 }}>🚶</Text>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
        ¡Hay una versión nueva de Camina!
      </Text>
      <Text style={{ color: '#B7A9E0', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 26 }}>
        Actualizá la app para seguir sumando Puntos con tus pasos. Es rapidito.
      </Text>
      {storeUrl ? (
        <Pressable
          onPress={() => Linking.openURL(storeUrl)}
          style={{ backgroundColor: '#7FEDC4', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#241748', fontWeight: '800', fontSize: 15 }}>Actualizar ahora</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
