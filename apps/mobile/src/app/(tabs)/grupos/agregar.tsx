import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { EmptyState } from '@/components/ui/EmptyState';
import { FriendPicker } from '@/components/friends/FriendPicker';
import { ChevronLeft } from '@/components/icons';
import { useFriends, useInviteFriendsToGroup } from '@/hooks/useFriends';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { friendlyServerError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';

// Agregar amigos a un grupo que ya existe: eligen a quién invitar y les llega la invitación.
export default function AgregarAlGrupoScreen() {
  const insets = useSafeAreaInsets();
  const { dark, accentIcon } = useThemeColors();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: friends, isLoading } = useFriends();
  const { data: detail } = useGroupDetail(groupId);
  const invite = useInviteFriendsToGroup();
  const [picked, setPicked] = useState<string[]>([]);

  const members = (detail?.members ?? []).map((m) => m.id);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function send() {
    invite.mutate(
      { groupId: groupId!, userIds: picked },
      {
        onSuccess: (n) => {
          Alert.alert(n > 0 ? 'Invitaciones enviadas' : 'Sin invitaciones nuevas', n > 0 ? 'Van a entrar al grupo cuando acepten.' : 'Esas personas ya tenían una invitación o ya están en el grupo.');
          router.back();
        },
        onError: (e) => Alert.alert('No se pudo invitar', friendlyServerError(e, 'Intentá de nuevo.')),
      },
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Agregar al grupo</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text className="text-[13.5px] text-muted-light dark:text-muted-dark mb-3.5" style={{ lineHeight: 19 }}>
          {detail ? `Les llega la invitación a ${detail.group.name} y se unen cuando aceptan.` : 'Les llega la invitación y se unen cuando aceptan.'}
        </Text>

        {!isLoading && (friends ?? []).length === 0 ? (
          <EmptyState title="Todavía no tenés amigos en Camina" text="Invitá a tus amigos con tu link. Mientras tanto, podés compartir el link o el código del grupo." actionLabel="Ir a Amigos" onAction={() => router.replace('/(tabs)/amigos')} />
        ) : (
          <>
            <FriendPicker friends={friends ?? []} selected={picked} taken={members} onToggle={toggle} />
            <Press
              accessibilityRole="button"
              disabled={picked.length === 0 || invite.isPending}
              onPress={send}
              className="rounded-2xl py-3.5 items-center mt-5"
              style={{ backgroundColor: colors.aquaDeep, opacity: picked.length === 0 || invite.isPending ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {invite.isPending ? 'Enviando…' : picked.length > 0 ? `Invitar a ${picked.length} ${picked.length === 1 ? 'amigo' : 'amigos'}` : 'Elegí a quién invitar'}
              </Text>
            </Press>
            <Text className="text-[12.5px] text-center text-muted-light dark:text-muted-dark mt-3.5">
              ¿Todavía no está en Camina? Compartí el link o el código desde el grupo.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
