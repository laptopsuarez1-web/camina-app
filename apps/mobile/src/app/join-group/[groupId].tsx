import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Users, IconBubble } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { plural } from '@/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { PENDING_GROUP_JOIN_KEY } from '@/constants/sharing';
import { colors } from '@/theme/tokens';
import { friendlyServerError } from '@/lib/errors';

// Entrada de camina://join-group/<código> — el link de "Compartir invitación"
// de un grupo (el parámetro es el código de invitación). Sin sesión, guarda el
// código y manda a loguearse primero; con sesión, muestra el grupo y deja unirse con un toque.
export default function JoinGroupScreen() {
  const { groupId: code } = useLocalSearchParams<{ groupId: string }>();
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const userId = session?.user.id;
  const [group, setGroup] = useState<{ id: string; name: string } | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Con la app cerrada, la sesión todavía se está leyendo: esperar antes de decidir
    // (si no, una persona con sesión válida terminaba en el login).
    if (!code || initializing) return;
    if (!session) {
      AsyncStorage.setItem(PENDING_GROUP_JOIN_KEY, code).catch(() => {}).then(() => router.replace('/(auth)/welcome'));
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('group_by_invite_code', { p_code: code });
      const g = data?.[0];
      if (error || !g) {
        Alert.alert('No encontramos ese grupo', 'El código puede estar mal escrito o el grupo ya no existe.');
        router.replace('/(tabs)/grupos');
        return;
      }
      setGroup({ id: g.id, name: g.name });
      setMemberCount(g.member_count ?? 0);
      setLoading(false);
    })();
  }, [code, session, initializing]);

  async function join() {
    if (!code || !userId) return;
    setJoining(true);
    const { data: groupId, error } = await supabase.rpc('join_group_with_code', { p_code: code });
    setJoining(false);
    if (error || !groupId) {
      Alert.alert('No se pudo unir al grupo', friendlyServerError(error, 'Intenta de nuevo.'));
      return;
    }
    router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId } });
  }

  if (loading || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color={colors.aqua} accessibilityLabel="Cargando" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark px-6 justify-center items-center">
      <View className="mb-5">
        <IconBubble icon={Users} tone="purple" size={84} />
      </View>
      <Text className="text-xl font-bold text-text-light dark:text-text-dark text-center mb-1.5">
        Te invitaron a &ldquo;{group.name}&rdquo;
      </Text>
      <Text className="text-muted-light dark:text-muted-dark text-[13px] text-center mb-8">
        {memberCount} {plural(memberCount, 'miembro', 'miembros')} caminando juntos en este grupo.
      </Text>
      <Press
        onPress={join}
        disabled={joining}
        accessibilityRole="button"
        accessibilityLabel="Unirme al grupo"
        accessibilityState={{ busy: joining }}
        className="bg-aqua-deep rounded-2xl py-4 px-10 items-center mb-3"
      >
        {joining ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Unirme al grupo</Text>}
      </Press>
      <Press accessibilityRole="button" onPress={() => router.replace('/(tabs)/grupos')}>
        <Text className="text-muted-light dark:text-muted-dark text-[13px]">Ahora no</Text>
      </Press>
    </View>
  );
}
