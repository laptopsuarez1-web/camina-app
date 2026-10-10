import { View, Text, Pressable, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import { BellButton } from '@/components/ui/BellButton';
import { useAuthStore } from '@/store/useAuthStore';
import { usePointsBalance } from '@/hooks/usePoints';
import { colors } from '@/theme/tokens';
import { PointsCounter, usePointsPulse } from '@/components/ui/PointsCounter';
import { AvatarImage } from '@/components/ui/AvatarImage';

// Cabecera clara (chip de puntos + campana + avatar) que el original repite
// arriba de Actividad, Grupos, Eventos y la lista de Canjes — antes solo
// vivía en Inicio (versión oscura) y en Puntos.
export function HeaderLight() {
  const profile = useAuthStore((s) => s.profile);
  const { data: balance, isError } = usePointsBalance();
  const dark = useColorScheme().colorScheme === 'dark';
  const topInset = useSafeAreaInsets().top;
  const { shown, scale } = usePointsPulse(balance);
  // Si el saldo no cargó se muestra "—" (no un 0 que parece real).
  const noBalance = isError && balance === undefined;

  return (
    <View className="flex-row justify-between items-center px-5 pb-3" style={{ paddingTop: Platform.OS === 'android' ? topInset + 24 : 56 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={noBalance ? 'Puntos, ver detalle' : `${balance ?? 0} Puntos, ver detalle`}
        hitSlop={6}
        onPress={() => router.push('/(tabs)/puntos')}
        className="flex-row items-center gap-1.5 bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full pl-1.5 pr-3"
        style={{ height: 32 }}
      >
        <PointsCounter shown={noBalance ? null : shown} coinSize={20} textStyle={{ color: dark ? colors.dark.text : colors.light.text, fontWeight: '700', fontSize: 15 }} />
      </Pressable>
      </Animated.View>
      <View className="flex-row items-center gap-2.5">
        <BellButton color={dark ? colors.dark.muted : colors.light.muted} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tu perfil"
          hitSlop={6}
          onPress={() => router.push('/(tabs)/perfil')}
          className="w-8 h-8 rounded-full bg-mint items-center justify-center overflow-hidden"
        >
          <AvatarImage
            uri={profile?.photo_url}
            style={{ width: '100%', height: '100%' }}
            fallback={<Text className="text-mint-dark font-bold">{(profile?.full_name || 'C')[0]?.toUpperCase()}</Text>}
          />
        </Pressable>
      </View>
    </View>
  );
}
