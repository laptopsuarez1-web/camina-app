import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Linking, ScrollView, Image, AppState, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router, useLocalSearchParams } from 'expo-router';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { colors } from '@/theme/tokens';
import { probeAndroidSetup, requestStepsPermission } from '@/lib/android-steps-probe';
import { GOOGLE_FIT_PACKAGE, HEALTH_CONNECT_PACKAGE, type AndroidStepsSetup } from '@/lib/android-steps-setup';

function openStore(id: string) {
  Linking.openURL(`market://details?id=${id}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`)
  );
}

type Copy = { title: string; text: string; action?: string; onAction?: () => void };

// Solo Android: Camina cuenta tus pasos desde Health Connect. La pantalla mira qué falta y pide solo eso.
export default function SaludScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const [setup, setSetup] = useState<AndroidStepsSetup>('checking');
  const [busy, setBusy] = useState(false);

  const autoAsked = useRef(false);

  const refresh = useCallback(async () => {
    setSetup(await probeAndroidSetup());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // Al volver de Health Connect o de la tienda se vuelve a mirar sola.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  function next() {
    router.replace(group ? { pathname: '/(tabs)/grupos/[groupId]', params: { groupId: group } } : '/(tabs)');
  }

  // Como en iPhone: al llegar a esta pantalla el permiso se pide solo, una vez. Si ya está todo listo, se sigue de largo.
  useEffect(() => {
    if (setup === 'active' && !autoAsked.current) {
      autoAsked.current = true;
      next();
    } else if (setup === 'needs-permission' && !autoAsked.current) {
      autoAsked.current = true;
      activate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  async function activate() {
    setBusy(true);
    try {
      await requestStepsPermission();
    } catch {
      // Si la hoja no se pudo abrir, se manda a los ajustes de Health Connect.
      openHealthConnectSettings();
    }
    await refresh();
    setBusy(false);
  }

  const copy: Record<AndroidStepsSetup, Copy> = {
    checking: { title: 'Revisando tu teléfono…', text: 'Un momento.' },
    'needs-system': {
      title: 'Falta Health Connect',
      text: 'Es la app oficial de Android donde se guardan tus pasos. Instálala o actualízala y vuelve a Camina.',
      action: 'Instalar Health Connect',
      onAction: () => openStore(HEALTH_CONNECT_PACKAGE),
    },
    'needs-permission': {
      title: 'Activa tus pasos',
      text: 'Camina solo lee tus pasos para convertirlos en Puntos. Toca el botón y acepta el permiso.',
      action: 'Activar mis pasos',
      onAction: activate,
    },
    'needs-source': {
      title: 'Permiso listo, faltan pasos',
      text: 'Health Connect todavía no tiene pasos guardados. Instala Google Fit (o usa Samsung Health, Fitbit u otra app de pasos), ábrela una vez y acepta sus permisos.',
      action: 'Instalar Google Fit',
      onAction: () => openStore(GOOGLE_FIT_PACKAGE),
    },
    active: { title: '¡Tus pasos están activados!', text: 'Camina ya está leyendo tus pasos. Cada 1.000 pasos suman 1 Punto.', action: 'Continuar', onAction: next },
    error: { title: 'No pudimos revisar tus pasos', text: 'Fue un problema pasajero. Intenta de nuevo.', action: 'Reintentar', onAction: refresh },
  };
  const c = copy[setup];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.authBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 32 }}>
        <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 14 }} />
        <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Activa el conteo de pasos</Text>
        <Text style={{ color: colors.authMuted, fontSize: 14, lineHeight: 21, marginBottom: 24 }}>
          Camina suma Puntos con los pasos que guarda Health Connect. Lo haces una sola vez.
        </Text>

        <View accessibilityLiveRegion="polite" style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 18, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {setup === 'checking' || busy ? <ActivityIndicator color={colors.mint} /> : null}
            <Text style={{ color: setup === 'active' ? colors.mint : '#fff', fontSize: 16, fontWeight: '800', flex: 1 }}>{c.title}</Text>
          </View>
          <Text style={{ color: colors.authMuted, fontSize: 13, lineHeight: 19, marginBottom: c.action ? 14 : 0 }}>{c.text}</Text>
          {c.action ? (
            <Press accessibilityRole="button" disabled={busy} onPress={c.onAction} style={{ backgroundColor: colors.mint, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 15 }}>{c.action}</Text>
            </Press>
          ) : null}
          {setup === 'needs-permission' ? (
            <Press accessibilityRole="button" onPress={() => openHealthConnectSettings()} style={{ paddingTop: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.authMuted, fontSize: 12.5 }}>Abrir ajustes de Health Connect</Text>
            </Press>
          ) : null}
        </View>

        {setup !== 'active' ? (
          <Press accessibilityRole="button" onPress={next} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.authMuted, fontSize: 12.5 }}>Lo hago después</Text>
          </Press>
        ) : null}
      </ScrollView>
    </View>
  );
}
