import { View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Press } from '@/components/ui/Press';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ChevronLeft } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { RankingBody } from '@/components/comunidad/RankingBody';
import { useThemeColors } from '@/theme/useThemeColors';

// Pantalla propia del ranking (links viejos y avisos). El contenido es el mismo que la solapa Ranking de Comunidad.
export default function RankingScreen() {
  const pull = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { dark, accentIcon, bg } = useThemeColors();
  const params = useLocalSearchParams<{ view?: string }>();

  return (
    <View className="flex-1" style={{ backgroundColor: bg }}>
      <AmbientBackground />
      <ScrollView refreshControl={pull} showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace }}>
        <View className="flex-row items-center justify-between mb-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <View style={{ width: 40 }} />
        </View>
        <RankingBody initialView={params.view === 'amigos' ? 'amigos' : 'global'} />
      </ScrollView>
    </View>
  );
}
