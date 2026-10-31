import { useState } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { FriendPicker } from '@/components/friends/FriendPicker';
import { ChevronLeft } from '@/components/icons';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { friendlyServerError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Grupo nuevo: nombre, meta semanal del grupo y, si querés, amigos para invitar de entrada (les llega la invitación y entran al aceptar).
const DEFAULT_GOAL = 50000; // meta general sugerida: el grupo la puede cambiar acá o después
const MIN_GOAL = 5000; // mismos límites que la política de la tabla groups (0019)
const MAX_GOAL = 5_000_000;

export default function NuevoGrupoScreen() {
  const insets = useSafeAreaInsets();
  const { dark, text, muted, accentIcon } = useThemeColors();
  const { friend } = useLocalSearchParams<{ friend?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const { data: friends } = useFriends();
  const [name, setName] = useState('');
  const [goalText, setGoalText] = useState(String(DEFAULT_GOAL));
  const goal = parseInt(goalText || '0', 10);
  const [picked, setPicked] = useState<string[]>(friend ? [friend] : []);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sin sesión');
      const { data: group, error } = await supabase.from('groups').insert({ name: name.trim(), created_by: userId, challenge_target: goal }).select().single();
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

  const goalOk = goal >= MIN_GOAL && goal <= MAX_GOAL;
  const ready = name.trim().length >= 2 && goalOk && !create.isPending;

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Grupo nuevo</Text>
          <View style={{ width: 40 }} />
        </View>

        <Glass className="rounded-3xl px-4 pt-3 pb-1 mb-2">
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Nombre del grupo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Los del gym"
            placeholderTextColor={muted}
            accessibilityLabel="Nombre del grupo"
            maxLength={40}
            autoFocus={!friend}
            className="text-[17px] font-semibold py-2 text-text-light dark:text-text-dark"
          />
        </Glass>

        <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 14, marginBottom: 4 }]}>Meta de la semana</Text>
        <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mx-1 mb-2.5" style={{ lineHeight: 18 }}>
          Ya viene en 50.000, pero la eligen ustedes: pasos que suman entre todos, de lunes a domingo. Si lo logran, el grupo lo festeja. Pueden cambiarla cuando quieran.
        </Text>
        <Glass className="rounded-3xl px-4 pt-3 pb-1">
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Pasos de la semana</Text>
          <TextInput
            value={goalText ? parseInt(goalText, 10).toLocaleString('es-BO') : ''}
            onChangeText={(v) => setGoalText(v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
            keyboardType="number-pad"
            accessibilityLabel="Meta semanal de pasos del grupo"
            className="text-[17px] font-semibold py-2 text-text-light dark:text-text-dark"
          />
        </Glass>
        <Text className="text-[12px] mt-2 mx-1" style={{ color: goalOk ? muted : colors.warn }}>
          {goalOk ? `Unos ${Math.round(goal / 7).toLocaleString('es-BO')} pasos por día entre todos.` : `La meta tiene que estar entre ${MIN_GOAL.toLocaleString('es-BO')} y ${MAX_GOAL.toLocaleString('es-BO')} pasos.`}
        </Text>

        {(friends ?? []).length > 0 ? (
          <>
            <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 14, marginBottom: 10 }]}>Invita a tus amigos</Text>
            <FriendPicker friends={friends!} selected={picked} onToggle={toggle} />
            <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2.5 mx-1">Les llega la invitación y entran cuando aceptan. Después también puedes compartir el link o el código.</Text>
          </>
        ) : (
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-3 mx-1" style={{ lineHeight: 18 }}>
            Cuando lo crees vas a poder compartir el link o el código del grupo.
          </Text>
        )}

        <Press
          accessibilityRole="button"
          disabled={!ready}
          onPress={() => create.mutate()}
          className="rounded-2xl py-3.5 items-center mt-5"
          style={{ backgroundColor: colors.aquaDeep, opacity: ready ? 1 : 0.5 }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {create.isPending ? 'Creando…' : picked.length > 0 ? `Crear e invitar a ${picked.length}` : 'Crear grupo'}
          </Text>
        </Press>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
