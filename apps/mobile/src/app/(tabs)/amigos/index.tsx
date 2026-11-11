import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { AmigosBody } from '@/components/comunidad/AmigosBody';
import { useThemeColors } from '@/theme/useThemeColors';

// Pantalla propia de Amigos (links viejos y avisos). El contenido es el mismo que la solapa Amigos de Comunidad.
export default function AmigosScreen() {
  const pull = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { dark, accentIcon } = useThemeColors();

  return (
    <View className="flex-1">
      <ScrollView refreshControl={pull} showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace }}>
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Amigos</Text>
          <View style={{ width: 40 }} />
        </View>
        <AmigosBody />
      </ScrollView>
    </View>
  );
}
