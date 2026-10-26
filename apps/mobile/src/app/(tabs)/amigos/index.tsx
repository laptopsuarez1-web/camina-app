import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { PersonAvatar } from '@/components/friends/PersonAvatar';
import { ChevronLeft, ChevronRight, Share2, Users } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { useFriends, useFriendRequests, useFriendActions } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import { celebrate } from '@/store/useCelebrationStore';
import { shareInviteLink } from '@/lib/invite';
import { friendlyServerError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Mis amigos: solicitudes pendientes, lista de amigos (con su racha y pasos de la semana), invitar por link y armar un grupo con ellos.
export default function AmigosScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { dark, text, line, muted, accentIcon, warnText } = useThemeColors();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: friends, isLoading, isError, refetch } = useFriends();
  const { data: requests } = useFriendRequests();
  const { respond } = useFriendActions();

  const profile = useAuthStore((s) => s.profile);
  const answer = (r: { user_id: string; full_name: string; photo_url: string | null }, accept: boolean) =>
    respond.mutate({ personId: r.user_id, accept }, {
      onSuccess: () => {
        if (!accept || !userId) return;
        celebrate({
          kind: 'friend-made',
          me: { id: userId, name: profile?.full_name ?? 'Tú', photoUrl: profile?.photo_url ?? null },
          friend: { id: r.user_id, name: r.full_name, photoUrl: r.photo_url },
          onCreateGroup: () => router.push({ pathname: '/(tabs)/grupos/nuevo', params: { friend: r.user_id } }),
          onRanking: () => router.push({ pathname: '/(tabs)/ranking', params: { view: 'amigos' } }),
        });
      },
      onError: (e) => Alert.alert('No se pudo responder', friendlyServerError(e, 'Intenta de nuevo.')),
    });

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace }}>
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Amigos</Text>
          <View style={{ width: 40 }} />
        </View>

        {(requests ?? []).length > 0 && (
          <Glass className="rounded-3xl overflow-hidden mb-4" style={{ borderColor: dark ? 'rgba(245,198,69,0.45)' : '#F0D9A0', borderWidth: 1 }}>
            <Text className="px-4 pt-3.5 pb-1 text-[13px] font-extrabold" style={{ color: warnText }}>
              {requests!.length === 1 ? '1 solicitud' : `${requests!.length} solicitudes`}
            </Text>
            {requests!.map((r, i) => (
              <View key={r.user_id} className="flex-row items-center px-4 py-3" style={{ gap: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: line }}>
                <Press accessibilityRole="button" accessibilityLabel={`Ver perfil de ${r.full_name}`} onPress={() => router.push({ pathname: '/(tabs)/amigos/[userId]', params: { userId: r.user_id } })} className="flex-row items-center flex-1" style={{ gap: 12 }}>
                  <PersonAvatar name={r.full_name} photoUrl={r.photo_url} size={42} />
                  <View className="flex-1">
                    <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{r.full_name}</Text>
                    <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Quiere ser tu amigo</Text>
                  </View>
                </Press>
                <Press accessibilityRole="button" accessibilityLabel={`Aceptar a ${r.full_name}`} disabled={respond.isPending} onPress={() => answer(r, true)} className="rounded-full px-3.5 py-2" style={{ backgroundColor: colors.aquaDeep }}>
                  <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>Aceptar</Text>
                </Press>
                <Press accessibilityRole="button" accessibilityLabel={`Rechazar a ${r.full_name}`} disabled={respond.isPending} onPress={() => answer(r, false)} className="rounded-full px-3.5 py-2" style={{ borderWidth: 1, borderColor: line }}>
                  <Text style={{ color: muted, fontSize: 12.5, fontWeight: '700' }}>No</Text>
                </Press>
              </View>
            ))}
          </Glass>
        )}

        <Text accessibilityRole="header" style={[typo.section, { color: text, marginBottom: 12 }]}>
          Tus amigos{friends && friends.length > 0 ? ` · ${friends.length}` : ''}
        </Text>

        {isLoading && <SkeletonGroup style={{ gap: 8 }}>{[0, 1, 2].map((i) => <SkeletonRow key={i} />)}</SkeletonGroup>}
        {isError && !friends && <EmptyState mascot="confundido" title="No pudimos cargar a tus amigos" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetch()} />}
        {!isLoading && !isError && (friends ?? []).length === 0 && (
          <EmptyState
            title="Todavía no tienes amigos en Camina"
            text="Mándales tu link: cuando se registren te llega la solicitud. Ganas 5 Puntos cuando tu amigo empiece a caminar. Los pasos los ven solo los amigos que aceptaste."
          />
        )}
        {(friends ?? []).length > 0 && (
          <Glass className="rounded-3xl overflow-hidden">
            {friends!.map((f, i) => (
              <Press
                key={f.user_id}
                accessibilityRole="button"
                accessibilityLabel={`${f.full_name}, ${f.week_steps.toLocaleString('es-BO')} pasos esta semana${f.streak > 0 ? `, racha de ${f.streak} días` : ''}. Ver perfil`}
                onPress={() => router.push({ pathname: '/(tabs)/amigos/[userId]', params: { userId: f.user_id } })}
                feedback="row"
                className="flex-row items-center p-3.5"
                style={{ gap: 12, borderBottomWidth: i === friends!.length - 1 ? 0 : 1, borderBottomColor: line }}
              >
                <PersonAvatar name={f.full_name} photoUrl={f.photo_url} size={42} />
                <View className="flex-1">
                  <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{f.full_name}</Text>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark" numberOfLines={1}>
                    {f.streak > 0 ? `Racha de ${f.streak} ${f.streak === 1 ? 'día' : 'días'}` : 'Sin racha'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-aqua-ink dark:text-mint" style={{ fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{f.week_steps.toLocaleString('es-BO')}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark">esta semana</Text>
                </View>
                <ChevronRight size={14} color={muted} />
              </Press>
            ))}
          </Glass>
        )}

        <View className="mt-5" style={{ gap: 10 }}>
          <Press
            accessibilityRole="button"
            onPress={() => userId && shareInviteLink(userId)}
            className="flex-row items-center justify-center rounded-2xl py-3.5"
            style={{ backgroundColor: colors.aquaDeep, gap: 8 }}
          >
            <Share2 size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Invitar amigos</Text>
          </Press>
          <Text className="text-[12px] text-center text-muted-light dark:text-muted-dark -mt-1">Ganas 5 Puntos cuando tu amigo empiece a caminar</Text>
          {(friends ?? []).length > 0 && (
            <Press
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/grupos/nuevo')}
              className="flex-row items-center justify-center rounded-2xl py-3.5"
              style={{ gap: 8, borderWidth: 1, borderColor: line, backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)' }}
            >
              <Users size={18} color={accentIcon} />
              <Text className="text-aqua-ink dark:text-mint" style={{ fontSize: 15, fontWeight: '700' }}>Crear grupo con amigos</Text>
            </Press>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
