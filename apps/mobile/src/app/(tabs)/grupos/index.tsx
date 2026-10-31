import { useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, ScrollView, Alert } from 'react-native';
import { KeyboardSafe } from '@/components/ui/KeyboardSafe';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Users, Trophy, ChevronRight, IconBubble } from '@/components/icons';
import { useMyGroupsWeek } from '@/hooks/useMyGroupsWeek';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/hooks/useGroups';
import { useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { useGroupInvites, useGroupInviteActions } from '@/hooks/useFriends';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { friendlyServerError } from '@/lib/errors';

export default function GruposScreen() {
  const tabSpace = useTabBarSpace();
  const { dark } = useThemeColors();
  const { data: groups, isLoading, isError, refetch } = useGroups();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const { data: myRank } = useMyWeeklyRank();
  const { data: invites } = useGroupInvites();
  const { accept, decline } = useGroupInviteActions();

  function answerInvite(groupId: string, yes: boolean) {
    if (yes) {
      accept.mutate(groupId, {
        onSuccess: (id) => id && router.push({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: id, bienvenida: '1' } }),
        onError: (e) => Alert.alert('No se pudo unir al grupo', friendlyServerError(e, 'Intenta de nuevo.')),
      });
    } else {
      decline.mutate(groupId, { onError: (e) => Alert.alert('No se pudo rechazar', friendlyServerError(e, 'Intenta de nuevo.')) });
    }
  }

  const scrollRef = useRef<ScrollView>(null);

  const joinGroup = useMutation({
    mutationFn: async (rawCode: string) => {
      const { data: groupId, error } = await supabase.rpc('join_group_with_code', { p_code: rawCode });
      if (error) throw error;
      if (!groupId) throw new Error('Código inválido');
      return groupId;
    },
    onSuccess: (groupId) => {
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.push({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId, bienvenida: '1' } });
    },
    onError: (e) => Alert.alert('No se pudo unir al grupo', e instanceof Error && e.message === 'Código inválido' ? 'No encontramos ningún grupo con ese código. Revísalo e intenta de nuevo.' : friendlyServerError(e, 'Intenta de nuevo.')),
  });

  const my = (groups ?? []).filter((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const { data: week } = useMyGroupsWeek(my, userId);

  return (
    <KeyboardSafe className="flex-1">
      <HeaderLight />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <ScreenTitle>Grupos</ScreenTitle>
      <Text className="text-muted-light dark:text-muted-dark mb-4" style={typo.body}>
        Camina, comparte y gana en equipo
      </Text>

      <Glass className="rounded-3xl overflow-hidden mb-4">
        <Press
          accessibilityRole="button"
          accessibilityLabel={`Ranking semanal: ${myRank ? `vas ${myRank.position}.º` : 'ver'}`}
          onPress={() => router.push('/(tabs)/ranking')}
          feedback="row"
          className="flex-row items-center p-4"
          style={{ gap: 12 }}
        >
          <IconBubble icon={Trophy} tone="gold" size={38} />
          <View className="flex-1">
            <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Ranking semanal</Text>
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">Global y entre amigos</Text>
          </View>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark">{myRank ? `Vas ${myRank.position}.º` : 'Ver'}</Text>
          <ChevronRight size={14} color={dark ? colors.dark.muted : colors.light.muted} />
        </Press>
      </Glass>

      {(invites ?? []).length > 0 && (
        <Glass className="rounded-3xl overflow-hidden mb-4" style={{ borderColor: dark ? 'rgba(245,198,69,0.45)' : '#F0D9A0', borderWidth: 1 }}>
          <Text className="px-4 pt-3.5 pb-1 text-[13px] font-extrabold text-warn-deep dark:text-warn-soft">
            {invites!.length === 1 ? 'Te invitaron a un grupo' : `Te invitaron a ${invites!.length} grupos`}
          </Text>
          {invites!.map((inv, i) => (
            <View key={inv.group_id} className="flex-row items-center px-4 py-3 border-line-light dark:border-line-dark" style={{ gap: 10, borderTopWidth: i === 0 ? 0 : 1 }}>
              <View className="flex-1">
                <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{inv.group_name}</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark" numberOfLines={1}>
                  {inv.inviter_name ?? 'Un amigo'} · {inv.member_count} {inv.member_count === 1 ? 'miembro' : 'miembros'}
                </Text>
              </View>
              <Press accessibilityRole="button" accessibilityLabel={`Unirme a ${inv.group_name}`} disabled={accept.isPending} onPress={() => answerInvite(inv.group_id, true)} className="bg-aqua-deep rounded-full px-3.5 py-2">
                <Text className="text-white text-xs font-bold">Unirme</Text>
              </Press>
              <Press accessibilityRole="button" accessibilityLabel={`Rechazar la invitación a ${inv.group_name}`} disabled={decline.isPending} onPress={() => answerInvite(inv.group_id, false)} className="rounded-full px-3.5 py-2 border border-line-light dark:border-line-dark">
                <Text className="text-muted-light dark:text-muted-dark text-xs font-bold">No</Text>
              </Press>
            </View>
          ))}
        </Glass>
      )}

      {isLoading && (
        <SkeletonGroup style={{ gap: 8 }}>
          {[0, 1].map((i) => <SkeletonRow key={i} chip={false} />)}
        </SkeletonGroup>
      )}

      {isError && !groups && (
        <View className="mb-7">
          <EmptyState mascot="confundido"
            title="No pudimos cargar"
            text="Revisa tu conexión e intenta de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        </View>
      )}

      {!isLoading && !(isError && !groups) && my.length === 0 && (
        <View className="mb-7">
          <EmptyState
            title="Todavía no estás en ningún grupo"
            text="Caminar con amigos es más fácil: suman pasos juntos, compiten en el ranking y arman desafíos con Puntos. Crea uno o súmate con el código que te pase un amigo."
            actionLabel="Crear un grupo"
            onAction={() => router.push('/(tabs)/grupos/nuevo')}
          />
        </View>
      )}

      {my.length > 0 && (
        <>
          <View className="gap-3 mb-7">
            {my.map((g) => {
              const w = week?.[g.id];
              const target = g.challenge_target ?? 0;
              const progress = target > 0 && w ? Math.min(1, w.total / target) : 0;
              const count = g.group_members.length;
              return (
                <Press
                  key={g.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${g.name}, ${count} ${count === 1 ? 'miembro' : 'miembros'}${w?.myRank ? `, vas ${w.myRank}.º` : ''}`}
                  onPress={() => router.push({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: g.id } })}
                  className="bg-auth-bg rounded-3xl p-4 gap-3"
                >
                  <View className="flex-row items-center gap-3">
                    <IconBubble icon={Users} tone="aqua" size={44} />
                    <View className="flex-1">
                      <Text className="text-white font-bold text-[15px]" numberOfLines={1}>{g.name}</Text>
                      <Text className="text-auth-muted text-xs">
                        {count} {count === 1 ? 'miembro' : 'miembros'}
                        {w && w.walkedToday > 0 ? ` · ${w.walkedToday} ${w.walkedToday === 1 ? 'caminó' : 'caminaron'} hoy` : ''}
                      </Text>
                    </View>
                    {w?.myRank != null && count > 1 && (
                      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(127,237,196,0.16)' }}>
                        <Text className="text-xs font-bold" style={{ color: colors.mint }}>Vas {w.myRank}.º</Text>
                      </View>
                    )}
                  </View>

                  {w && (
                    target > 0 ? (
                      <View className="gap-1.5">
                        <View className="flex-row justify-between">
                          <Text className="text-auth-muted text-xs">Meta de la semana</Text>
                          <Text className="text-white text-xs font-bold">
                            {w.total.toLocaleString('es-BO')} / {target.toLocaleString('es-BO')}
                          </Text>
                        </View>
                        <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                          <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: colors.mint }} />
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row justify-between">
                        <Text className="text-auth-muted text-xs">Pasos de la semana</Text>
                        <Text className="text-white text-xs font-bold">{w.total.toLocaleString('es-BO')}</Text>
                      </View>
                    )
                  )}

                  {w && w.avatars.length > 0 && (
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row">
                        {w.avatars.map((a, i) => (
                          <View
                            key={a.id}
                            className="w-7 h-7 rounded-full items-center justify-center overflow-hidden"
                            style={{ marginLeft: i === 0 ? 0 : -8, borderWidth: 2, borderColor: colors.authBg, backgroundColor: i % 2 ? '#C6A2F5' : colors.mint }}
                          >
                            <AvatarImage
                              uri={a.photoUrl}
                              style={{ width: '100%', height: '100%' }}
                              fallback={<Text className="text-[12px] font-bold" style={{ color: colors.authBg }}>{(a.name || 'C')[0]?.toUpperCase()}</Text>}
                            />
                          </View>
                        ))}
                        {count > w.avatars.length && (
                          <Text className="text-auth-muted text-xs self-center ml-1.5">+{count - w.avatars.length}</Text>
                        )}
                      </View>
                      {target > 0 && progress >= 1 && (
                        <Text className="text-xs font-bold" style={{ color: colors.mint }}>¡Meta cumplida!</Text>
                      )}
                    </View>
                  )}
                </Press>
              );
            })}
          </View>
        </>
      )}

      <Text accessibilityRole="header" className="mb-3 text-text-light dark:text-text-dark" style={typo.section}>
        ¿Te invitaron a un grupo?
      </Text>
      <View className="gap-2.5">
        <Glass className="rounded-2xl p-4">
          <Text className="text-muted-light dark:text-muted-dark text-xs mb-2.5">
            Los grupos son privados: se entra con el código o el link que te pasa quien lo armó.
          </Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Código de invitación"
              accessibilityLabel="Código de invitación"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="go"
              onSubmitEditing={() => code.length >= 6 && joinGroup.mutate(code)}
              // El campo está al final de la lista: al abrir el teclado se baja la lista para que quede a la vista.
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              className="flex-1 border border-line-light dark:border-line-dark rounded-sm px-3 py-2.5 text-text-light dark:text-text-dark"
            />
            <Press
              accessibilityRole="button"
              accessibilityLabel="Unirme con el código"
              onPress={() => code.length >= 6 && joinGroup.mutate(code)}
              disabled={joinGroup.isPending || code.length < 6}
              className="bg-aqua-deep rounded-full px-4 py-2.5"
              style={{ opacity: code.length < 6 ? 0.5 : 1 }}
            >
              <Text className="text-white text-xs font-semibold">Unirme</Text>
            </Press>
          </View>
        </Glass>
        {my.length > 0 && (
          <Press
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/grupos/nuevo')}
            className="flex-row items-center gap-3 rounded-2xl p-4"
            style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9B5EA' }}
          >
            <View className="w-9.5 h-9.5 rounded-full bg-purple-deep items-center justify-center">
              <Plus size={16} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[13px] text-text-light dark:text-text-dark">
                Crear un grupo nuevo
              </Text>
              <Text className="text-muted-light dark:text-muted-dark text-xs">
                Arma tu propio grupo y suma amigos
              </Text>
            </View>
          </Press>
        )}
      </View>
      </ScrollView>
    </KeyboardSafe>
  );
}
