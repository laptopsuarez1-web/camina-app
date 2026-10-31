import { useMemo, useState } from 'react';
import { View, Alert, Platform, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { GoalWheel, GOAL_VALUES } from '@/components/GoalWheel';
import { DEFAULT_DAILY_GOAL } from '@/constants/business-rules';

const VALUES = GOAL_VALUES;

// Primera vez: la persona elige cuántos pasos por día quiere hacer, deslizando una ruedita (como el temporizador del reloj).
// Arranca en 5.000, que es lo que recomendamos; se puede subir o bajar y cambiar después desde Perfil.
export default function MetaScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const startIndex = VALUES.indexOf(DEFAULT_DAILY_GOAL);
  const [index, setIndex] = useState(startIndex);
  const [saving, setSaving] = useState(false);
  const value = VALUES[index];

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
        <GoalWheel index={index} onIndex={setIndex} dark />
        <Text style={{ color: colors.authMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 16 }}>{hint}</Text>
      </View>

      <Text style={{ color: colors.authMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 14 }}>
        Puedes caminar más que tu meta: todos tus pasos suman. La cambias cuando quieras desde Perfil.
      </Text>
      <Press accessibilityRole="button" onPress={save} disabled={saving} style={{ backgroundColor: colors.mint, borderRadius: 16, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
        <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 15 }}>{saving ? 'Guardando…' : `Listo, ${value.toLocaleString('es-BO')} pasos`}</Text>
      </Press>
    </View>
  );
}
