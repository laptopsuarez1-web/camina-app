import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronLeft, ChevronRight, Gift, IconBubble } from '@/components/icons';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { MyRedemptionsSection, type RedemptionRow } from '@/components/home/HomeSections';
import { useMyRedemptions, useMyStoryShares } from '@/hooks/useBenefits';
import { useCaminaCard } from '@/hooks/useCaminaCard';
import { useStoryFlow } from '@/components/story/StoryFlow';
import { storyStateFor } from '@/lib/story';
import { useThemeColors } from '@/theme/useThemeColors';

// Mis canjes: todo lo que la persona canjeó (con su estado) y el acceso a sus tarjetas de fidelidad. Se abre desde Perfil y desde Inicio.
export default function MisCanjesScreen() {
  const pull = usePullToRefresh();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { dark, accentIcon, muted } = useThemeColors();
  const { data: redemptions, isLoading } = useMyRedemptions();
  const { data: storyShares } = useMyStoryShares();
  const { data: caminaCard } = useCaminaCard();
  const story = useStoryFlow();

  return (
    <View className="flex-1">
      <ScrollView refreshControl={pull} showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace }}>
        <View className="flex-row items-center justify-between mb-5 px-5">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }}>
            <ChevronLeft size={18} color={accentIcon} />
          </Press>
          <Text accessibilityRole="header" className="text-[17px] font-bold text-aqua-ink dark:text-mint">Mis canjes</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ gap: 14 }}>
          <MyRedemptionsSection
            title={null}
            limit={50}
            redemptions={redemptions as unknown as RedemptionRow[] | undefined}
            loading={isLoading}
            storyFor={(r) => (storyShares ? storyStateFor(r, storyShares[r.id]) : null)}
            onStory={(r) => story.start({ redemptionId: r.id, businessName: r.business?.name ?? 'el local', benefitName: r.benefit?.name ?? 'Tu canje' })}
          />
          <Press accessibilityRole="button" onPress={() => router.push('/(tabs)/tarjetas')} className="mx-5">
            <Glass className="rounded-3xl flex-row items-center p-4" style={{ gap: 12 }}>
              <IconBubble icon={Gift} tone="gold" size={40} />
              <View className="flex-1">
                <Text className="font-bold text-[14.5px] text-text-light dark:text-text-dark">Tarjetas de fidelidad</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark">
                  {caminaCard && caminaCard.goal > 0 ? `Llevas ${Math.min(caminaCard.stamps, caminaCard.goal)} de ${caminaCard.goal} sellos` : 'Junta sellos con tus canjes y elige un premio gratis'}
                </Text>
              </View>
              <ChevronRight size={14} color={muted} />
            </Glass>
          </Press>
        </View>
        {story.element}
      </ScrollView>
    </View>
  );
}
