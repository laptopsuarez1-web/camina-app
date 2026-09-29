import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Users, Trophy, IconBubble } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/hooks/useGroups';
import { useGlobalRanking, useCommunityAverage } from '@/hooks/useGlobalRanking';
import { colors } from '@/theme/tokens';
import { HeaderLight } from '@/components/ui/HeaderLight';

export default function GruposScreen() {
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

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-[21px] font-extrabold text-text-light dark:text-text-dark">Grupos</Text>
        <Pressable
          onPress={() => setCreating((v) => !v)}
          className="bg-aqua w-8.5 h-8.5 rounded-full items-center justify-center"
        >
          <Plus size={17} color="#fff" />
        </Pressable>
      </View>
      <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-4">
        Caminá, compartí y ganá en equipo
      </Text>

      <View className="flex-row bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full p-1 mb-4">
        <Pressable
          onPress={() => setView('mios')}
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'mios' ? colors.aqua : 'transparent' }}
        >
          <Text className="text-[12.5px] font-semibold" style={{ color: view === 'mios' ? '#fff' : colors.light.muted }}>
            Mis grupos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('ranking')}
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: view === 'ranking' ? colors.aqua : 'transparent' }}
        >
          <Text className="text-[12.5px] font-semibold" style={{ color: view === 'ranking' ? '#fff' : colors.light.muted }}>
            Ranking global
          </Text>
        </Pressable>
      </View>

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
              <View
                key={r.user_id}
                className="flex-row items-center gap-3 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-2xl p-3.5"
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
                    <Text className="text-aqua text-xs font-bold">{(r.full_name || 'C')[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <Text className="flex-1 text-[13.5px] text-text-light dark:text-text-dark" numberOfLines={1}>
                  {r.user_id === userId ? `${r.full_name} (vos)` : r.full_name}
                </Text>
                <Text className="text-[12.5px] font-bold text-text-light dark:text-text-dark">
                  {Number(r.total_steps).toLocaleString('es-BO')}
                </Text>
              </View>
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
      {creating && (
        <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-4 mb-4">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre del grupo"
            className="border border-line-light dark:border-line-dark rounded-sm px-3 py-2.5 mb-2.5 text-text-light dark:text-text-dark"
          />
          <Pressable
            onPress={() => name.trim() && createGroup.mutate(name.trim())}
            disabled={createGroup.isPending}
            className="bg-aqua rounded-sm py-3 items-center"
          >
            <Text className="text-white font-semibold">Crear</Text>
          </Pressable>
        </View>
      )}

      {isLoading && <ActivityIndicator color={colors.aqua} />}

      {my.length > 0 && (
        <>
          <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">
            Mis grupos
          </Text>
          <View className="gap-2.5 mb-5">
            {my.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: g.id } })}
                className="flex-row items-center gap-3 bg-auth-bg rounded-2xl p-4"
              >
                <IconBubble icon={Users} tone="aqua" size={44} />
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{g.name}</Text>
                  <Text className="text-auth-muted text-xs">{g.group_members.length} miembros</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">
        Grupos para unirte
      </Text>
      <View className="gap-2.5">
        {other.map((g) => (
          <View
            key={g.id}
            className="flex-row items-center justify-between bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9.5 h-9.5 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center">
                <Users size={16} color={colors.purple} />
              </View>
              <View>
                <Text className="text-text-light dark:text-text-dark">{g.name}</Text>
                <Text className="text-muted-light dark:text-muted-dark text-xs">
                  {g.group_members.length} miembros
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => joinGroup.mutate(g.id)}
              className="bg-aqua rounded-full px-3.5 py-1.5"
            >
              <Text className="text-white text-xs font-semibold">Unirme</Text>
            </Pressable>
          </View>
        ))}
        {!isLoading && other.length === 0 && (
          <Text className="text-muted-light dark:text-muted-dark text-[13px]">
            No hay más grupos por ahora.
          </Text>
        )}
        <Pressable
          onPress={() => setCreating(true)}
          className="flex-row items-center gap-3 bg-purple-light-light dark:bg-purple-light-dark rounded-2xl p-4"
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
      </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}
