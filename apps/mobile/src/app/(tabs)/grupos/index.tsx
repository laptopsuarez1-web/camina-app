import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Users, Trophy, IconBubble } from '@/components/icons';
import { useMyGroupsWeek } from '@/hooks/useMyGroupsWeek';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/hooks/useGroups';
import { useGlobalRanking, useCommunityAverage } from '@/hooks/useGlobalRanking';
import { colors } from '@/theme/tokens';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';

export default function GruposScreen() {
  const tabSpace = useTabBarSpace();
  const { data: groups, isLoading } = useGroups();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'mios' | 'ranking'>(params.view === 'ranking' ? 'ranking' : 'mios');
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
    onError: (e) => Alert.alert('No se pudo crear el grupo', e.message),
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!userId) throw new Error('Sin sesión');
      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
    onError: (e) => Alert.alert('No se pudo unir al grupo', e.message),
  });

  const my = (groups ?? []).filter((g) => g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const other = (groups ?? []).filter((g) => !g.group_members.some((m: { user_id: string }) => m.user_id === userId));
  const { data: week } = useMyGroupsWeek(my, userId);

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <Text className="text-[21px] font-extrabold text-text-light dark:text-text-dark mb-1">Grupos</Text>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">
        Caminá, compartí y ganá en equipo
      </Text>

      <Glass className="flex-row rounded-full p-1 mb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: view === 'mios' }}
          onPress={() => setView('mios')}
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'mios' ? colors.aquaDeep : 'transparent' }}
        >
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] font-semibold" style={{ ...(view === 'mios' ? { color: '#fff' } : null) }}>
            Mis grupos
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: view === 'ranking' }}
          onPress={() => setView('ranking')}
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'ranking' ? colors.aquaDeep : 'transparent' }}
        >
          <Text className="text-muted-light dark:text-muted-dark text-[12.5px] font-semibold" style={{ ...(view === 'ranking' ? { color: '#fff' } : null) }}>
            Ranking global
          </Text>
        </Pressable>
      </Glass>

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
          {rankingLoading && <ActivityIndicator color={colors.aqua} />}
          <View className="gap-2">
            {(ranking ?? []).map((r: { user_id: string; full_name: string; photo_url: string | null; total_steps: number }, i: number) => (
              <Glass
                key={r.user_id}
                className="flex-row items-center gap-3 rounded-2xl p-3.5"
              >
                <View className="w-7 items-center">
                  {i < 3 ? <Trophy size={16} color={['#F2985C', '#9C8FC2', '#B08D57'][i]} /> : (
                    <Text className="text-xs font-bold text-muted-light dark:text-muted-dark">{i + 1}°</Text>
                  )}
                </View>
                {r.photo_url ? (
                  <Image source={{ uri: r.photo_url }} className="w-9 h-9 rounded-full" />
                ) : (
                  <View className="w-9 h-9 rounded-full bg-aqua-light-light dark:bg-aqua-light-dark items-center justify-center">
                    <Text className="text-aqua-deep dark:text-aqua text-xs font-bold">{(r.full_name || 'C')[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <Text className="flex-1 text-[13.5px] text-text-light dark:text-text-dark" numberOfLines={1}>
                  {r.user_id === userId ? `${r.full_name} (vos)` : r.full_name}
                </Text>
                <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'rgba(79,195,168,0.16)' }}>
                  <Text className="text-[12.5px] font-bold text-aqua-deep dark:text-aqua">
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
      {isLoading && <ActivityIndicator color={colors.aqua} />}

      {!isLoading && my.length === 0 && (
        <View className="mb-5">
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
          <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">
            Mis grupos
          </Text>
          <View className="gap-2.5 mb-5">
            {my.map((g) => {
              const w = week?.[g.id];
              const target = g.challenge_target ?? 0;
              const progress = target > 0 && w ? Math.min(1, w.total / target) : 0;
              const count = g.group_members.length;
              return (
                <Pressable
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
                            {a.photoUrl ? (
                              <Image source={{ uri: a.photoUrl }} className="w-full h-full" />
                            ) : (
                              <Text className="text-[12px] font-bold" style={{ color: colors.authBg }}>{(a.name || 'C')[0]?.toUpperCase()}</Text>
                            )}
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
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {other.length > 0 && (
        <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">
          Grupos para unirte
        </Text>
      )}
      <View className="gap-2.5">
        {other.map((g) => (
          <Glass
            key={g.id}
            className="flex-row items-center justify-between rounded-md p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9.5 h-9.5 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Users size={16} color={colors.purple} />
              </View>
              <View>
                <Text className="text-text-light dark:text-text-dark">{g.name}</Text>
                <Text className="text-muted-light dark:text-muted-dark text-xs">
                  {g.group_members.length} {g.group_members.length === 1 ? 'miembro' : 'miembros'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unirme a ${g.name}`}
              onPress={() => joinGroup.mutate(g.id)}
              className="bg-aqua-deep rounded-full px-3.5 py-1.5"
            >
              <Text className="text-white text-xs font-semibold">Unirme</Text>
            </Pressable>
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
            <Pressable
              accessibilityRole="button"
              onPress={() => name.trim() && createGroup.mutate(name.trim())}
              disabled={createGroup.isPending}
              className="bg-aqua-deep rounded-sm py-3 items-center"
            >
              <Text className="text-white font-semibold">Crear</Text>
            </Pressable>
          </Glass>
        )}
        {!creating && my.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setCreating(true)}
            className="flex-row items-center gap-3 rounded-2xl p-4"
            style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9B5EA' }}
          >
            <View className="w-9.5 h-9.5 rounded-full bg-purple items-center justify-center">
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
          </Pressable>
        )}
      </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}
