import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Users } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { PENDING_GROUP_JOIN_KEY } from '@/constants/sharing';
import { colors } from '@/theme/tokens';
import type { Group } from '@/lib/database.types';

// Entrada de camina://join-group/<groupId> — el link de "Compartir
// invitación" de un grupo. Sin sesión, guarda el groupId y manda a loguearse
// primero; con sesión, muestra el grupo y deja unirse con un toque.
export default function JoinGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const [group, setGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    if (!session) {
      AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, groupId).then(() => router.replace('/(auth)/welcome'));
      return;
    }
    (async () => {
      const [{ data: g, error }, { data: count }] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.rpc('group_member_count', { p_group_id: groupId }),
      ]);
      if (error || !g) {
        Alert.alert('No encontramos ese grupo', 'El link puede haber vencido o el grupo ya no existe.');
        router.replace('/(tabs)/grupos');
        return;
      }
      setGroup(g);
      setMemberCount(count ?? 0);
      setLoading(false);
    })();
  }, [groupId, session]);

  async function join() {
    if (!groupId || !userId) return;
    setJoining(true);
    const { error } = await supabase
      .from('group_members')
      .upsert({ group_id: groupId, user_id: userId }, { onConflict: 'group_id,user_id' });
    setJoining(false);
    if (error) {
      Alert.alert('No se pudo unir al grupo', error.message);
      return;
    }
    router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId } });
  }

  if (loading || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark px-6 justify-center items-center">
      <View className="w-20 h-20 rounded-full bg-purple-light-light dark:bg-purple-light-dark items-center justify-center mb-5">
        <Users size={32} color={colors.purple} />
      </View>
      <Text className="text-xl font-bold text-text-light dark:text-text-dark text-center mb-1.5">
        Te invitaron a &ldquo;{group.name}&rdquo;
      </Text>
      <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center mb-8">
        {memberCount} miembro{memberCount === 1 ? '' : 's'} caminando juntos en este grupo.
      </Text>
      <Pressable onPress={join} disabled={joining} className="bg-aqua rounded-2xl py-4 px-10 items-center mb-3">
        {joining ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Unirme al grupo</Text>}
      </Pressable>
      <Pressable onPress={() => router.replace('/(tabs)/grupos')}>
        <Text className="text-muted-light dark:text-muted-dark text-[13px]">Ahora no</Text>
      </Pressable>
    </View>
  );
}
