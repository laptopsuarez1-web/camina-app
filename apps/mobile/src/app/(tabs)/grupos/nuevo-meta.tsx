import { useState } from 'react';
import { View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronLeft } from '@/components/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { friendlyServerError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Grupo nuevo, paso 2: la meta de la semana (pasos entre todos). Viene en 50.000 y el grupo la cambia con las opciones de abajo.
// Acá se crea el grupo, con el nombre y los amigos del paso anterior.
const GOALS = [25000, 50000, 100000, 150000];
const DEFAULT_GOAL = 50000;

export default function NuevaMetaScreen() {
  const insets = useSafeAreaInsets();
  const { dark, text, muted, accentIcon, accentText } = useThemeColors();
  const { name, friends } = useLocalSearchParams<{ name: string; friends?: string }>();
  const picked = friends ? friends.split(',').filter(Boolean) : [];
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sin sesión');
      const { data: group, error } = await supabase.from('groups').insert({ name: (name ?? '').trim(), created_by: userId, challenge_target: goal }).select().single();
      if (error) throw error;
      const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
      if (memberError) throw memberError;
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

      <View className="flex-1 items-center justify-center">
        <Text className="text-[14px] text-muted-light dark:text-muted-dark text-center" style={{ maxWidth: 280, lineHeight: 20 }}>
          ¿Cuántos pasos quieren sumar entre todos, de lunes a domingo?
        </Text>
        <Text accessibilityLabel={`${goal} pasos`} allowFontScaling={false} style={{ fontSize: 60, lineHeight: 68, fontWeight: '800', letterSpacing: -1.5, color: text, marginTop: 14, fontVariant: ['tabular-nums'] }}>
          {goal.toLocaleString('es-BO')}
        </Text>
        <Text className="text-[15px] font-semibold" style={{ color: accentText }}>pasos</Text>
        <Text className="text-[13px] text-muted-light dark:text-muted-dark text-center" style={{ marginTop: 16 }}>
          Unos {Math.round(goal / 7).toLocaleString('es-BO')} pasos por día entre todos.
        </Text>
      </View>

      <Text style={[typo.support, { color: muted, textAlign: 'center', marginBottom: 10 }]}>Si lo logran, el grupo lo festeja. Puedes cambiarla después.</Text>
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
              onPress={() => setGoal(n)}
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
