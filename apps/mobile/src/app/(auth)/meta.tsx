import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Alert, Platform, type NativeScrollEvent, type NativeSyntheticEvent, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { friendlyError } from '@/lib/errors';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL } from '@/constants/business-rules';

const ROW = 52;
const VISIBLE = 5; // filas a la vista: la del medio es la elegida
const STEP = 500;
const MAX = 30000;
const VALUES = Array.from({ length: (MAX - MIN_DAILY_GOAL) / STEP + 1 }, (_, i) => MIN_DAILY_GOAL + i * STEP);

// Primera vez: la persona elige cuántos pasos por día quiere hacer, deslizando una ruedita (como el temporizador del reloj).
// Arranca en 5.000, que es lo que recomendamos; se puede subir o bajar y cambiar después desde Inicio.
export default function MetaScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const startIndex = VALUES.indexOf(DEFAULT_DAILY_GOAL);
  const [index, setIndex] = useState(startIndex);
  const [saving, setSaving] = useState(false);
  const last = useRef(startIndex);
  const wheel = useRef<ScrollView>(null);
  const placed = useRef(false);
  const value = VALUES[index];
  const pad = ((VISIBLE - 1) / 2) * ROW;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(VALUES.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (i !== last.current) {
      last.current = i;
      setIndex(i);
      buzz.selection();
    }
  }

  const hint = useMemo(() => {
    if (value < DEFAULT_DAILY_GOAL) return 'Para empezar está bien. Cuando te acostumbres, súbela.';
    if (value === DEFAULT_DAILY_GOAL) return 'Es la meta que recomendamos para arrancar.';
    if (value <= 10000) return '¡Buena meta! Cada 1.000 pasos te dan 1 Punto.';
    return 'Meta exigente: ve de a poco y cuídate.';
  }, [value]);

  function next() {
    if (Platform.OS === 'android') {
      router.replace({ pathname: '/(auth)/salud', params: group ? { group } : {} });
      return;
    }
    router.replace(group ? { pathname: '/(tabs)/grupos/[groupId]', params: { groupId: group } } : '/(tabs)');
  }

  async function save() {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      router.replace('/(auth)/welcome');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ daily_goal: value }).eq('id', userId);
      if (error) throw error;
      await useAuthStore.getState().refreshProfile();
      next();
    } catch (e) {
      Alert.alert('No pudimos guardar tu meta', friendlyError(e, 'Intenta de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.authBg, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32 }}>
      <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 14 }} />
      <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 }}>¿Cuántos pasos quieres hacer por día?</Text>
      <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(127,237,196,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6 }}>
        <Text style={{ color: colors.mint, fontSize: 13.5, fontWeight: '700' }}>Te recomendamos 5.000 pasos por día</Text>
      </View>

      <View className="flex-1 justify-center">
        <View style={{ height: ROW * VISIBLE, overflow: 'hidden' }}>
          {/* Franja de la fila elegida, como en el reloj del teléfono */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: pad, height: ROW, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <ScrollView
            accessibilityRole="adjustable"
            accessibilityLabel="Meta de pasos por día"
            accessibilityValue={{ text: `${value.toLocaleString('es-BO')} pasos` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              const i = e.nativeEvent.actionName === 'increment' ? Math.min(VALUES.length - 1, index + 1) : Math.max(0, index - 1);
              last.current = i;
              setIndex(i);
            }}
            showsVerticalScrollIndicator={false}
            snapToInterval={ROW}
            decelerationRate="fast"
            ref={wheel}
            // contentOffset solo funciona en iOS: en Android y web la ruedita se lleva a 5.000 apenas se mide.
            onLayout={() => {
              if (placed.current) return;
              placed.current = true;
              requestAnimationFrame(() => wheel.current?.scrollTo({ y: startIndex * ROW, animated: false }));
            }}
            contentOffset={{ x: 0, y: startIndex * ROW }}
            contentContainerStyle={{ paddingVertical: pad }}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {VALUES.map((v, i) => {
              const d = Math.abs(i - index);
              return (
                <View key={v} style={{ height: ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Text style={{ color: '#fff', opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.25, fontSize: d === 0 ? 34 : 26, fontWeight: d === 0 ? '800' : '600', fontVariant: ['tabular-nums'] }}>
                    {v.toLocaleString('es-BO')}
                  </Text>
                  {d === 0 ? <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>pasos</Text> : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
        <Text style={{ color: colors.authMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 16 }}>{hint}</Text>
      </View>

      <Text style={{ color: colors.authMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 14 }}>
        Puedes caminar más que tu meta: todos tus pasos suman. La cambias cuando quieras desde Inicio.
      </Text>
      <Press accessibilityRole="button" onPress={save} disabled={saving} style={{ backgroundColor: colors.mint, borderRadius: 16, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
        <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 15 }}>{saving ? 'Guardando…' : `Listo, ${value.toLocaleString('es-BO')} pasos`}</Text>
      </Press>
    </View>
  );
}
