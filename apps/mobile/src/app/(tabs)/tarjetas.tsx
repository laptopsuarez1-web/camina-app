import { View, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { ChevronLeft, CheckCircle2, Clock, IconBubble } from '@/components/icons';
import { DarkHeader } from '@/components/ui/DarkHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { CaminaCardView } from '@/components/loyalty/CaminaCardView';
import { PrizeSheet } from '@/components/loyalty/PrizeSheet';
import { useCaminaCard, useChooseCaminaPrize } from '@/hooks/useCaminaCard';
import { colors } from '@/theme/tokens';
import type { CaminaPastCard } from '@/lib/database.types';

const dayFmt = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' });
const formatDay = (iso: string) => dayFmt.format(new Date(iso)).replace(/\./g, '');

function PastRow({ card }: { card: CaminaPastCard }) {
  const used = card.status === 'used';
  return (
    <Glass className="flex-row items-center rounded-2xl px-3.5 py-3" style={{ gap: 12 }} accessible>
      <BusinessAvatar logoUrl={card.logo_url} category={card.category} size={44} />
      <View className="flex-1">
        <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark" numberOfLines={2}>{card.benefit_name ?? 'Premio'}</Text>
        <Text className="text-[13px] text-muted-light dark:text-muted-dark" numberOfLines={1}>{card.business_name ?? 'Comercio'}</Text>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark" style={{ marginTop: 2 }}>
          {used ? 'Canjeado el' : 'Venció el'} {formatDay(card.closed_at)}
        </Text>
      </View>
      <IconBubble icon={used ? CheckCircle2 : Clock} tone={used ? 'aqua' : 'orange'} size={34} />
    </Glass>
  );
}

// Tarjeta de fidelidad: la tarjeta actual arriba y, abajo, las que ya se usaron o vencieron.
export default function TarjetasScreen() {
  const tabSpace = useTabBarSpace();
  const { data: card, isLoading, isError, refetch } = useCaminaCard();
  const choose = useChooseCaminaPrize();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: tabSpace }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ['camina-card'] });
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
          <Text accessibilityRole="header" className="text-white text-[17px] font-bold">Tarjetas de fidelidad</Text>
        </View>
        <Text className="text-auth-muted text-[13px] mt-3 leading-[18px]">
          Cada canje que confirma un comercio suma un sello, en cualquier comercio. Con 5 sellos eliges un premio gratis entre los comercios que participan y tienes 30 días para canjearlo en el local.
        </Text>
      </DarkHeader>

      <View className="px-5 pt-4" style={{ gap: 12 }}>
        {isLoading && (
          <SkeletonGroup style={{ gap: 12 }}>
            {[0, 1].map((i) => <SkeletonRow key={i} />)}
          </SkeletonGroup>
        )}
        {isError && !card && (
          <EmptyState mascot="confundido" title="No pudimos cargar tu tarjeta" text="Revisa tu conexión e intenta de nuevo." actionLabel="Reintentar" onAction={() => refetch()} />
        )}
        {card ? (
          <>
            <CaminaCardView card={card} onOpen={() => setPrizeOpen(true)} animate />
            <PrizeSheet
              card={card}
              visible={prizeOpen}
              onClose={() => setPrizeOpen(false)}
              choosing={choose.isPending}
              onChoose={(id) => choose.mutate(id, { onSuccess: () => setPrizeOpen(false) })}
              onGoToBusiness={() => router.push('/(tabs)/canjes')}
            />

            <Text accessibilityRole="header" className="mt-4 text-[17px] font-bold text-text-light dark:text-text-dark">Tarjetas anteriores</Text>
            {card.past.length > 0 ? (
              card.past.map((p) => <PastRow key={p.completed_at} card={p} />)
            ) : (
              <Text className="text-[13.5px] text-muted-light dark:text-muted-dark">Cuando uses tu primer premio, tu tarjeta anterior aparece aquí.</Text>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
