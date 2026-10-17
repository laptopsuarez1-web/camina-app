import { View, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { ChevronLeft } from '@/components/icons';
import { DarkHeader } from '@/components/ui/DarkHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { LoyaltyCardView } from '@/components/LoyaltyCardView';
import { useLoyaltyCards } from '@/hooks/useLoyalty';
import { colors } from '@/theme/tokens';

// "Mis tarjetas": se llega desde Puntos. Una tarjeta por local, con los canjes que fue sumando.
export default function TarjetasScreen() {
  const tabSpace = useTabBarSpace();
  const { data: cards, isLoading, isError, refetch } = useLoyaltyCards();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: tabSpace }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ['loyalty-cards'] });
            setRefreshing(false);
          }}
          tintColor={colors.aqua}
        />
      }
    >
      <DarkHeader>
        <View className="flex-row items-center gap-3">
          <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={8} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <ChevronLeft size={16} color="#fff" />
          </Press>
          <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Mis tarjetas</Text>
        </View>
        <Text className="text-auth-muted text-[13px] mt-3 leading-[18px]">
          Cada local tiene la suya. Con 5 canjes, el siguiente premio de tarjeta sale gratis.
        </Text>
      </DarkHeader>

      <View className="px-5 pt-4" style={{ gap: 12 }}>
        {isLoading && (
          <SkeletonGroup style={{ gap: 12 }}>
            {[0, 1].map((i) => <SkeletonRow key={i} />)}
          </SkeletonGroup>
        )}
        {isError && !cards && (
          <EmptyState title="No pudimos cargar tus tarjetas" text="Revisá tu conexión e intentá de nuevo." actionLabel="Reintentar" onAction={() => refetch()} />
        )}
        {cards?.map((card) => (
          <Press key={card.business_id} accessibilityRole="button" accessibilityLabel={`Ver ${card.business_name}`} onPress={() => router.push('/(tabs)/canjes')}>
            <LoyaltyCardView card={card} showHistory title={card.business_name} />
          </Press>
        ))}
        {cards && cards.length === 0 && (
          <EmptyState
            title="Todavía no tenés tarjetas"
            text="Cuando canjees en un local con tarjeta de fidelidad, tu primer sello aparece acá."
          />
        )}
      </View>
    </ScrollView>
  );
}
