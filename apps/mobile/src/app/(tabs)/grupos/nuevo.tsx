import { useState } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, TextInput } from '@/components/ui/Text';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { FriendPicker } from '@/components/friends/FriendPicker';
import { ChevronLeft, Camera, Check } from '@/components/icons';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { uploadGroupPhoto } from '@/lib/avatar';
import { GROUP_BACKGROUNDS, GROUP_GOAL_DEFAULT, GROUP_GOAL_MAX, GROUP_GOAL_MIN, GROUP_GOAL_PRESETS } from '@/lib/group-look';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { friendlyServerError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Grupo nuevo: nombre y, si querés, amigos para invitar de entrada (les llega la invitación y entran al aceptar).
export default function NuevoGrupoScreen() {
  const insets = useSafeAreaInsets();
  const { dark, text, muted, accentIcon } = useThemeColors();
  const { friend } = useLocalSearchParams<{ friend?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const { data: friends } = useFriends();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(GROUP_GOAL_DEFAULT);
  const [customGoal, setCustomGoal] = useState('');
  const [background, setBackground] = useState<string>('aqua');
  const [photo, setPhoto] = useState<{ uri: string; b64: string | null } | null>(null);
  const [picked, setPicked] = useState<string[]>(friend ? [friend] : []);

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1], base64: true });
    if (!r.canceled) setPhoto({ uri: r.assets[0].uri, b64: r.assets[0].base64 ?? null });
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sin sesión');
      const { data: group, error } = await supabase.from('groups').insert({ name: name.trim(), created_by: userId, challenge_target: goal, background }).select().single();
      if (error) throw error;
      const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
      if (memberError) throw memberError;
      let photoFailed = false;
      if (photo) {
        // La foto es un extra: si falla, el grupo ya existe y se puede poner después desde el menú del grupo.
        try {
          const url = await uploadGroupPhoto(group.id, photo.uri, photo.b64);
          const { error: photoError } = await supabase.from('groups').update({ photo_url: url }).eq('id', group.id);
          if (photoError) photoFailed = true;
        } catch {
          photoFailed = true;
        }
      }
      if (picked.length > 0) {
        // Si la invitación falla, el grupo ya existe: se avisa y la persona puede reintentar desde "Agregar amigos".
        const { error: inviteError } = await supabase.rpc('invite_friends_to_group', { p_group: group.id, p_users: picked });
        if (inviteError) return { id: group.id as string, inviteFailed: true, photoFailed };
      }
      return { id: group.id as string, inviteFailed: false, photoFailed };
    },
    onSuccess: ({ id, inviteFailed, photoFailed }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      if (inviteFailed) Alert.alert('El grupo está creado', 'No pudimos mandar las invitaciones. Prueba de nuevo desde "Agregar amigos".');
      if (photoFailed) Alert.alert('El grupo está creado', 'No pudimos subir la foto. Puedes ponerla desde el menú del grupo.');
      router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: id, nuevo: '1' } });
    },
    onError: (e) => Alert.alert('No se pudo crear el grupo', friendlyServerError(e, 'Intenta de nuevo.')),
  });

  const goalOk = goal >= GROUP_GOAL_MIN && goal <= GROUP_GOAL_MAX;
  const ready = name.trim().length >= 2 && goalOk && !create.isPending;
  const perDay = Math.round(goal / 7);

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

        <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 14, marginBottom: 4 }]}>Meta del grupo</Text>
        <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-2.5 mx-1">Pasos que suman entre todos en la semana. La puedes cambiar después.</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {GROUP_GOAL_PRESETS.map((p) => {
            const on = goal === p.value && customGoal === '';
            return (
              <Press
                key={p.value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => { setGoal(p.value); setCustomGoal(''); }}
                className="rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: on ? colors.aquaDeep : dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}
              >
                <Text style={{ color: on ? '#fff' : text, fontWeight: '700', fontSize: 14 }}>{p.value.toLocaleString('es-BO')}</Text>
                <Text style={{ color: on ? 'rgba(255,255,255,0.8)' : muted, fontSize: 11.5 }}>{p.label}</Text>
              </Press>
            );
          })}
        </View>
        <Glass className="rounded-3xl px-4 pt-3 pb-1 mt-2.5">
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Otra meta (pasos por semana)</Text>
          <TextInput
            value={customGoal}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, 7);
              setCustomGoal(digits);
              if (digits) setGoal(parseInt(digits, 10));
            }}
            keyboardType="number-pad"
            placeholder="Ej: 75000"
            placeholderTextColor={muted}
            accessibilityLabel="Otra meta semanal de pasos"
            className="text-[17px] font-semibold py-2 text-text-light dark:text-text-dark"
          />
        </Glass>
        <Text className="text-[12px] mt-2 mx-1" style={{ color: goalOk ? muted : colors.dangerInk }}>
          {goalOk ? `≈ ${perDay.toLocaleString('es-BO')} pasos por día entre todos.` : `La meta va de ${GROUP_GOAL_MIN.toLocaleString('es-BO')} a ${GROUP_GOAL_MAX.toLocaleString('es-BO')} pasos.`}
        </Text>

        <Text accessibilityRole="header" style={[typo.section, { color: text, marginTop: 16, marginBottom: 10 }]}>Foto y fondo</Text>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <Press accessibilityRole="button" accessibilityLabel="Elegir foto del grupo" onPress={pickPhoto}>
            <AvatarImage
              uri={photo?.uri}
              style={{ width: 64, height: 64, borderRadius: 32 }}
              fallback={
                <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Camera size={22} color={accentIcon} />
                </View>
              }
            />
          </Press>
          <View className="flex-row flex-wrap flex-1" style={{ gap: 8 }}>
            {GROUP_BACKGROUNDS.map((b) => {
              const on = background === b.key;
              return (
                <Press key={b.key} accessibilityRole="button" accessibilityLabel={`Fondo ${b.label}`} accessibilityState={{ selected: on }} onPress={() => setBackground(b.key)}>
                  <LinearGradient colors={b.colors} style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 1, borderColor: on ? colors.aqua : 'rgba(0,0,0,0.12)' }}>
                    {on && <Check size={14} color="#fff" weight="bold" />}
                  </LinearGradient>
                </Press>
              );
            })}
          </View>
        </View>

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
