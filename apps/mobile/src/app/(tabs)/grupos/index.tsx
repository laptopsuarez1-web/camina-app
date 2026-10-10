import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Users, Trophy, IconBubble } from '@/components/icons';
import { useMyGroupsWeek } from '@/hooks/useMyGroupsWeek';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/hooks/useGroups';
import { useGlobalRanking, useCommunityAverage } from '@/hooks/useGlobalRanking';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { plural } from '@/lib/format';
import { useGlobalRankingOpen } from '@/hooks/useUserCount';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { friendlyServerError } from '@/lib/errors';

export default function GruposScreen() {
  const tabSpace = useTabBarSpace();
  const { dark } = useThemeColors();
  const { data: groups, isLoading, isError, refetch } = useGroups();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const params = useLocalSearchParams<{ view?: string }>();
  const rankingOpen = useGlobalRankingOpen();
  const [pickedView, setView] = useState<'mios' | 'ranking'>(params.view === 'ranking' ? 'ranking' : 'mios');
  // Hasta que haya más de 1.000 usuarios no hay ranking global: solo se ven los grupos.
  const view = rankingOpen ? pickedView : 'mios';
  const { data: ranking, isLoading: rankingLoading } = useGlobalRanking();
  const { data: average } = useCommunityAverage();

  const createGroup = useMutation({
    mutationFn: async (groupName: string) => {
      if (!userId) throw new Error('Sin sesión');
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name: groupName, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId });
      if (memberError) throw memberError;
      return group;
    },
    onSuccess: () => {
      setCreating(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e) => Alert.alert('No se pudo crear el grupo', friendlyServerError(e, 'Intentá de nuevo.')),
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!userId) throw new Error('Sin sesión');
      // upsert: un doble toque no debe devolver el error crudo de clave duplicada (23505).
      const { error } = await supabase
        .from('group_members')
        .upsert({ group_id: groupId, user_id: userId }, { onConflict: 'group_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
    onError: (e) => Alert.alert('No se pudo unir al grupo', friendlyServerError(e, 'Intentá de nuevo.')),
  });

  const my = (groups ?? []).filter((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const other = (groups ?? []).filter((g) => !g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const { data: week } = useMyGroupsWeek(my, userId);

  return (
    <View className="flex-1">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <ScreenTitle>Grupos</ScreenTitle>
      <Text className="text-muted-light dark:text-muted-dark mb-4" style={typo.body}>
        Caminá, compartí y ganá en equipo
      </Text>

      {rankingOpen && (
      <Glass className="flex-row rounded-full p-1 mb-4">
        <Press
          accessibilityRole="button"
          accessibilityState={{ selected: view === 'mios' }}
          aria-pressed={view === 'mios'}
          onPress={() => setView('mios')}
          haptic="selection"
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'mios' ? colors.aquaDeep : 'transparent' }}
        >
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] font-semibold" style={{ ...(view === 'mios' ? { color: '#fff' } : null) }}>
            Mis grupos
          </Text>
        </Press>
        <Press
          accessibilityRole="button"
          accessibilityState={{ selected: view === 'ranking' }}
          aria-pressed={view === 'ranking'}
          onPress={() => setView('ranking')}
          haptic="selection"
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'ranking' ? colors.aquaDeep : 'transparent' }}
        >
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] font-semibold" style={{ ...(view === 'ranking' ? { color: '#fff' } : null) }}>
            Ranking global
          </Text>
        </Press>
      </Glass>
      )}

      {view === 'ranking' ? (
        <>
          {average != null && average > 0 && (
            <View className="bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4 mb-4">
              <Text className="text-[13px] text-text-light dark:text-text-dark">
                La comunidad de Camina camina en promedio{' '}
                <Text className="font-bold">{Math.round(average).toLocaleString('es-BO')} pasos</Text> por semana.
              </Text>
            </View>
          )}
          {rankingLoading && (
            <SkeletonGroup style={{ gap: 8 }}>
              {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </SkeletonGroup>
          )}
          <View className="gap-2">
            {(ranking ?? []).map((r: { user_id: string; full_name: string; photo_url: string | null; total_steps: number }, i: number) => (
              <Glass
                key={r.user_id}
                accessible
                accessibilityLabel={`Puesto ${i + 1}: ${r.full_name || 'Caminante'}${r.user_id === userId ? ' (vos)' : ''}, ${Number(r.total_steps).toLocaleString('es-BO')} ${plural(Number(r.total_steps), 'paso', 'pasos')}`}
                className="flex-row items-center gap-3 rounded-2xl p-3.5"
              >
                <View className="w-7 items-center">
                  {i < 3 ? <Trophy size={16} color={[colors.warn, '#9C8FC2', '#B08D57'][i]} /> : (
                    <Text className="text-xs font-bold text-muted-light dark:text-muted-dark">{i + 1}.º</Text>
                  )}
                </View>
                <AvatarImage
                  uri={r.photo_url}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  fallback={
                    <View className="w-9 h-9 rounded-full bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
                      <Text className="text-aqua-ink dark:text-aqua text-xs font-bold">{(r.full_name || 'C')[0]?.toUpperCase()}</Text>
                    </View>
                  }
                />
                <Text className="flex-1 text-[13.5px] text-text-light dark:text-text-dark" numberOfLines={1}>
                  {r.user_id === userId ? `${r.full_name} (vos)` : r.full_name}
                </Text>
                <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'rgba(79,195,168,0.16)' }}>
                  <Text className="text-[12.5px] font-bold text-aqua-ink dark:text-aqua">
                    {Number(r.total_steps).toLocaleString('es-BO')}
                  </Text>
                </View>
              </Glass>
            ))}
            {!rankingLoading && (ranking ?? []).length === 0 && (
              <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center py-6">
                Todavía nadie caminó esta semana — sé el primero.
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
      {isLoading && (
        <SkeletonGroup style={{ gap: 8 }}>
          {[0, 1].map((i) => <SkeletonRow key={i} chip={false} />)}
        </SkeletonGroup>
      )}

      {isError && !groups && (
        <View className="mb-7">
          <EmptyState
            title="No pudimos cargar"
            text="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        </View>
      )}

      {!isLoading && !(isError && !groups) && my.length === 0 && (
        <View className="mb-7">
          <EmptyState
            title="Todavía no estás en ningún grupo"
            text="Caminar con amigos es más fácil: suman pasos juntos, compiten en el ranking y arman desafíos con puntos. Creá uno o sumate a uno de abajo."
            actionLabel="Crear un grupo"
            onAction={() => setCreating(true)}
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

      {other.length > 0 && (
        <Text accessibilityRole="header" className="mb-3 text-text-light dark:text-text-dark" style={typo.section}>
          Grupos para unirte
        </Text>
      )}
      <View className="gap-2.5">
        {other.map((g) => (
          <Glass
            key={g.id}
            className="flex-row items-center justify-between rounded-md p-4"
          >
            <View className="flex-row items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
              <View className="w-9.5 h-9.5 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Users size={16} color={dark ? colors.purpleSoft : colors.purple} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text className="text-text-light dark:text-text-dark">{g.name}</Text>
                <Text className="text-muted-light dark:text-muted-dark text-xs">
                  {g.group_members.length} {g.group_members.length === 1 ? 'miembro' : 'miembros'}
                </Text>
              </View>
            </View>
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Unirme a ${g.name}`}
              onPress={() => joinGroup.mutate(g.id)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              className="bg-aqua-deep rounded-full px-3.5 py-1.5"
              style={{ flexShrink: 0, marginLeft: 8 }}
            >
              <Text className="text-white text-xs font-semibold">Unirme</Text>
            </Press>
          </Glass>
        ))}
        {creating && (
          <Glass className="rounded-2xl p-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre del grupo"
              accessibilityLabel="Nombre del grupo"
              autoFocus
              className="border border-line-light dark:border-line-dark rounded-sm px-3 py-2.5 mb-2.5 text-text-light dark:text-text-dark"
            />
            <Press
              accessibilityRole="button"
              onPress={() => name.trim() && createGroup.mutate(name.trim())}
              disabled={createGroup.isPending}
              className="bg-aqua-deep rounded-sm py-3 items-center"
            >
              <Text className="text-white font-semibold">Crear</Text>
            </Press>
          </Glass>
        )}
        {!creating && my.length > 0 && (
          <Press
            accessibilityRole="button"
            onPress={() => setCreating(true)}
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
                Armá tu propio grupo y sumá amigos
              </Text>
            </View>
          </Press>
        )}
      </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}
