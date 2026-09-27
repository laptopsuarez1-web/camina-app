import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(user_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export default function GruposScreen() {
  const { data: groups, isLoading } = useGroups();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

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
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14">
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
              <View key={g.id} className="flex-row items-center gap-3 bg-auth-bg rounded-2xl p-4">
                <View className="w-11 h-11 rounded-full bg-white/10 items-center justify-center">
                  <Users size={19} color={colors.mint} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{g.name}</Text>
                  <Text className="text-auth-muted text-xs">{g.group_members.length} miembros</Text>
                </View>
              </View>
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
      </View>
    </ScrollView>
  );
}
