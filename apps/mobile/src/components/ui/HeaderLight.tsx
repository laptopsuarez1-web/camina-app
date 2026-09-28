import { View, Text, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';

// Cabecera clara (chip de puntos + campana + avatar) que el original repite
// arriba de Actividad, Grupos, Eventos y la lista de Canjes — antes solo
// vivía en Inicio (versión oscura) y en Puntos.
export function HeaderLight() {
  const profile = useAuthStore((s) => s.profile);
  const { data: balance } = usePointsBalance();

  return (
    <View className="flex-row justify-between items-center px-5 pt-14 pb-3 bg-bg-light dark:bg-bg-dark">
      <Pressable
        onPress={() => router.push('/(tabs)/puntos')}
        className="flex-row items-center gap-1.5 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full pl-1.5 pr-3"
        style={{ height: 32 }}
      >
        <Image source={require('@/../assets/camina-coin.png')} style={{ width: 20, height: 20, borderRadius: 10 }} />
        <Text className="text-text-light dark:text-text-dark font-bold text-[15px]">{balance ?? 0}</Text>
      </Pressable>
      <View className="flex-row items-center gap-2.5">
        <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark w-8 h-8 rounded-full items-center justify-center">
          <Bell size={15} color={colors.light.muted} />
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/perfil')}
          className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
        >
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
