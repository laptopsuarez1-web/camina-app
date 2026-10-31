import { useRef, useState } from 'react';
import { View, ScrollView, Alert, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { uploadGroupPhoto } from '@/lib/avatar';
import { friendlyServerError } from '@/lib/errors';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Grupo nuevo, paso 2: la meta de la semana (pasos entre todos), con una ruedita como la de la meta diaria: se desliza de 1.000 en 1.000.
// Viene en 50.000; las opciones de abajo llevan la rueda de un salto. Acá se crea el grupo, con el nombre y los amigos del paso anterior.
// Más de 300.000 o menos de 10.000 se puede poner después, escribiéndolo en el grupo (el servidor acepta de 5.000 a 5.000.000).
const GOALS = [25000, 50000, 100000, 150000];
const DEFAULT_GOAL = 50000;
const MIN = 10000;
const MAX = 300000;
const STEP = 1000;
const VALUES = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP);
const ROW = 56;
const VISIBLE = 5; // filas a la vista: la del medio es la elegida

export default function NuevaMetaScreen() {
  const insets = useSafeAreaInsets();
  const { dark, text, accentIcon, accentText } = useThemeColors();
  const { name, friends, background, photo } = useLocalSearchParams<{ name: string; friends?: string; background?: string; photo?: string }>();
  const picked = friends ? friends.split(',').filter(Boolean) : [];
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const startIndex = VALUES.indexOf(DEFAULT_GOAL);
  const [index, setIndex] = useState(startIndex);
  const last = useRef(startIndex);
  const wheel = useRef<ScrollView>(null);
  const placed = useRef(false);
  const goal = VALUES[index];
  const pad = ((VISIBLE - 1) / 2) * ROW;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(VALUES.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (i !== last.current) {
      last.current = i;
      setIndex(i);
      buzz.selection();
    }
  }

  function jumpTo(value: number) {
    const i = VALUES.indexOf(value);
    if (i < 0) return;
    wheel.current?.scrollTo({ y: i * ROW, animated: true });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sin sesión');
      const { data: group, error } = await supabase.from('groups').insert({ name: (name ?? '').trim(), created_by: userId, challenge_target: goal, ...(background ? { background } : {}) }).select().single();
      if (error) throw error;
      const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
      if (memberError) throw memberError;
      if (photo) {
        // La foto es un extra: si falla, el grupo ya existe y se puede poner después desde el menú del grupo.
        try {
          const url = await uploadGroupPhoto(group.id, photo);
          await supabase.from('groups').update({ photo_url: url }).eq('id', group.id);
        } catch {
          // se puede volver a elegir desde el menú del grupo
        }
      }
      if (picked.length > 0) {
        // Si la invitación falla, el grupo ya existe: se avisa y la persona puede reintentar desde "Agregar amigos".
        const { error: inviteError } = await supabase.rpc('invite_friends_to_group', { p_group: group.id, p_users: picked });
        if (inviteError) return { id: group.id as string, inviteFailed: true };
      }
      return { id: group.id as string, inviteFailed: false };
    },
    onSuccess: ({ id, inviteFailed }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      if (inviteFailed) Alert.alert('El grupo está creado', 'No pudimos mandar las invitaciones. Prueba de nuevo desde "Agregar amigos".');
      router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: id, nuevo: '1' } });
    },
    onError: (e) => Alert.alert('No se pudo crear el grupo', friendlyServerError(e, 'Intenta de nuevo.')),
  });

  return (
    <View className="flex-1 px-5" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }}>
      <View className="flex-row items-center justify-between mb-5">
        <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
          <ChevronLeft size={18} color={accentIcon} />
        </Press>
        <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Meta de la semana</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text className="text-[14px] text-muted-light dark:text-muted-dark text-center self-center" style={{ maxWidth: 290, lineHeight: 20 }}>
        ¿Cuántos pasos quieren sumar entre todos, de lunes a domingo?
      </Text>

      <View className="flex-1 justify-center">
        <View style={{ height: ROW * VISIBLE, overflow: 'hidden' }}>
          {/* Franja de la fila elegida, como en el reloj del teléfono */}
          <Glass pointerEvents="none" className="rounded-2xl" style={{ position: 'absolute', left: 0, right: 0, top: pad, height: ROW }} />
          <ScrollView
            accessibilityRole="adjustable"
            accessibilityLabel="Meta de pasos de la semana"
            accessibilityValue={{ text: `${goal.toLocaleString('es-BO')} pasos` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              const i = e.nativeEvent.actionName === 'increment' ? Math.min(VALUES.length - 1, index + 1) : Math.max(0, index - 1);
              wheel.current?.scrollTo({ y: i * ROW, animated: false });
              last.current = i;
              setIndex(i);
            }}
            showsVerticalScrollIndicator={false}
            snapToInterval={ROW}
            decelerationRate="fast"
            ref={wheel}
            // contentOffset solo funciona en iOS: en Android y web la ruedita se lleva a 50.000 apenas se mide.
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
                  <Text allowFontScaling={false} style={{ color: text, opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.25, fontSize: d === 0 ? 36 : 26, fontWeight: d === 0 ? '800' : '600', fontVariant: ['tabular-nums'] }}>
                    {v.toLocaleString('es-BO')}
                  </Text>
                  {d === 0 ? <Text style={{ color: accentText, fontSize: 16, fontWeight: '700' }}>pasos</Text> : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Text style={[typo.support, { textAlign: 'center', marginBottom: 10 }]} className="text-muted-light dark:text-muted-dark">Si lo logran, el grupo lo festeja. Puedes cambiarla después.</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {GOALS.map((n) => {
          const on = goal === n;
          return (
            <Press
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n.toLocaleString('es-BO')} pasos`}
              accessibilityState={{ selected: on }}
              aria-pressed={on}
              haptic="selection"
              onPress={() => jumpTo(n)}
              className="flex-1"
            >
              <Glass className="rounded-2xl items-center" style={{ paddingVertical: 14, ...(on ? { backgroundColor: colors.aquaDeep, borderColor: colors.aquaDeep } : null) }}>
                <Text allowFontScaling={false} style={{ fontSize: 15, fontWeight: '800', color: on ? '#fff' : text, fontVariant: ['tabular-nums'] }}>{n.toLocaleString('es-BO')}</Text>
              </Glass>
            </Press>
          );
        })}
      </View>

      <Press
        accessibilityRole="button"
        disabled={create.isPending}
        onPress={() => create.mutate()}
        className="rounded-2xl py-3.5 items-center mt-4"
        style={{ backgroundColor: colors.aquaDeep, opacity: create.isPending ? 0.5 : 1 }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
          {create.isPending ? 'Creando…' : picked.length > 0 ? `Crear e invitar a ${picked.length}` : 'Crear grupo'}
        </Text>
      </Press>
    </View>
  );
}
