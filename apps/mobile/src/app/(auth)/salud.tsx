import { View, Text, Pressable, Linking, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { colors } from '@/theme/tokens';

const HEALTH_CONNECT = 'com.google.android.apps.healthdata';
const GOOGLE_FIT = 'com.google.android.apps.fitness';

function openStore(id: string) {
  Linking.openURL(`market://details?id=${id}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`)
  );
}

// Solo Android: Camina cuenta tus pasos desde Health Connect, que necesita una app de pasos que escriba ahí.
export default function SaludScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();

  function next() {
    router.replace(group ? { pathname: '/(tabs)/grupos/[groupId]', params: { groupId: group } } : '/(tabs)');
  }

  const steps: [string, string, string, () => void][] = [
    ['1', 'Instalá Health Connect', 'Es la app oficial de Android donde se guardan tus pasos. En Android 14 o más nuevo ya viene en el teléfono.', () => openStore(HEALTH_CONNECT)],
    ['2', 'Instalá Google Fit', 'Cuenta tus pasos con el sensor del teléfono y los guarda en Health Connect. Abrila una vez y aceptá sus permisos.', () => openStore(GOOGLE_FIT)],
    ['3', 'Dale permiso a Camina', 'En Health Connect, dentro de Permisos de apps, activá "Pasos" para Camina y para Google Fit.', () => openHealthConnectSettings()],
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.authBg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>👟</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Activá el conteo de pasos</Text>
        <Text style={{ color: colors.authMuted, fontSize: 14, lineHeight: 21, marginBottom: 24 }}>
          Para que Camina sume tus pasos de forma segura, se leen desde Health Connect. Son tres pasos y lo hacés una sola vez.
        </Text>

        {steps.map(([n, title, text, onPress]) => (
          <View key={n} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.mintDark, fontWeight: '800' }}>{n}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 }}>{title}</Text>
            </View>
            <Text style={{ color: colors.authMuted, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>{text}</Text>
            <Pressable onPress={onPress} style={{ backgroundColor: 'rgba(127,237,196,0.18)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.mint, fontWeight: '700', fontSize: 13 }}>Abrir</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={next} style={{ backgroundColor: colors.mint, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 15 }}>Ya lo tengo, continuar</Text>
        </Pressable>
        <Pressable onPress={next} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#B3A6D6', fontSize: 12.5 }}>Lo hago después</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
