import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, ScrollView, Alert, AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Users, Flame, CheckCircle2, IconBubble } from '@/components/icons';
import { useRetos, useClaimReto, type Reto } from '@/hooks/useRetos';
import { usePromotions, useJoinPromotion, type PromotionItem } from '@/hooks/usePromotions';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { Glass } from '@/components/ui/Glass';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmptyIllustration } from '@/components/ui/EmptyIllustration';
import { celebrate } from '@/store/useCelebrationStore';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { friendlyServerError } from '@/lib/errors';
import { ChallengeCard, EventCard, PromoSheet, RetoCamina } from '@/components/promos/PromoCards';

export default function EventosScreen() {
  const tabSpace = useTabBarSpace();
  const { data: retos } = useRetos();
  const claim = useClaimReto();
  const { data: promos, isLoading: promosLoading, isError: promosError, refetch: refetchPromos } = usePromotions();
  const join = useJoinPromotion();
  const params = useLocalSearchParams<{ tab?: string }>();
  // Viene de Inicio con ?tab=...; si la persona toca una pestaña, manda su elección.
  const [picked, setPicked] = useState<{ from: string | undefined; tab: 'eventos' | 'desafios' } | null>(null);
  const tab = picked && picked.from === params.tab ? picked.tab : params.tab === 'desafios' ? 'desafios' : 'eventos';
  const setTab = (t: 'eventos' | 'desafios') => setPicked({ from: params.tab, tab: t });
  const [open, setOpen] = useState<PromotionItem | null>(null);
  const { width } = useWindowDimensions();
  const cardSize = Math.min(width - 40, 380);
  const events = (promos ?? []).filter((p) => p.kind === 'evento');
  const challenges = (promos ?? []).filter((p) => p.kind === 'desafio' || p.kind === 'sorteo');

  async function handleJoin(p: PromotionItem) {
    try {
      await join.mutateAsync(p.id);
      // iOS ignora accessibilityLiveRegion: se anuncia a mano que ya quedó anotado.
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Ya estás anotado');
      Alert.alert('¡Listo!', p.kind === 'evento' ? 'Ya estás anotado en el evento.' : 'Ya eres parte del desafío. Tus pasos cuentan desde ahora.');
    } catch (e) {
      Alert.alert('No pudimos anotarte', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  async function handleClaim(reto: Reto) {
    try {
      const points = await claim.mutateAsync(reto.id);
      celebrate({ kind: 'sheet', title: '¡Reto cumplido!', body: reto.title, points: Number(points) || reto.reward_points });
    } catch (e) {
      Alert.alert('No pudimos darte los Puntos', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }

  return (
    <View className="flex-1">
      <HeaderLight />
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <ScreenTitle>{tab === 'eventos' ? 'Eventos' : 'Desafíos'}</ScreenTitle>
      <View accessibilityRole="tablist" className="flex-row rounded-full p-1 mb-4 bg-purple-light dark:bg-card-dark border border-line-light dark:border-line-dark" style={{ gap: 4 }}>
        {(['eventos', 'desafios'] as const).map((k) => {
          const on = tab === k;
          return (
            <Press
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              haptic="selection"
              feedback="none"
              onPress={() => setTab(k)}
              className={`flex-1 rounded-full items-center py-2.5 ${on ? 'bg-purple-deep' : ''}`}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: on ? '#fff' : undefined }} className={on ? '' : 'text-purple-ink dark:text-purple-soft'}>
                {k === 'eventos' ? 'Eventos' : 'Desafíos'}
              </Text>
            </Press>
          );
        })}
      </View>
      <Text className="text-muted-light dark:text-muted-dark mb-4" style={typo.body}>
        {tab === 'eventos' ? 'Vive experiencias únicas con tus marcas favoritas' : 'Súmate, camina y gana premios de tus marcas favoritas'}
      </Text>
      {tab === 'eventos' && (
        <View className="gap-4 mb-7 items-center">
          {events.map((p) => <EventCard key={p.id} p={p} size={cardSize} onPress={() => setOpen(p)} />)}
        </View>
      )}
      {tab === 'desafios' && challenges.length > 0 && (
        <View className="gap-4 mb-7">
          {challenges.map((p) => <ChallengeCard key={p.id} p={p} onPress={() => setOpen(p)} />)}
        </View>
      )}
      <PromoSheet p={open ? (promos ?? []).find((x) => x.id === open.id) ?? open : null} onClose={() => setOpen(null)} onJoin={handleJoin} joining={join.isPending} />

      {promosError && !promos && (
        <View className="mb-8">
          <EmptyState
            title="No pudimos cargar"
            text="Revisa tu conexión e intenta de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetchPromos()}
          />
        </View>
      )}
      {!promosLoading && !promosError && (tab === 'eventos' ? events.length === 0 : challenges.length === 0) && (
        <Glass className="rounded-3xl items-center mb-8" style={{ paddingVertical: 34, paddingHorizontal: 24 }}>
          <EmptyIllustration kind="eventos" />
          <Text className="font-extrabold text-[20px] text-text-light dark:text-text-dark text-center" style={{ marginTop: 12 }}>
            {tab === 'eventos' ? 'Todavía no hay eventos' : 'Todavía no hay desafíos de comercios'}
          </Text>
          <Text className="text-muted-light dark:text-muted-dark text-[14px] text-center leading-5" style={{ marginTop: 6 }}>
            Cuando un comercio de tu ciudad publique uno, lo vas a ver aquí.
          </Text>
        </Glass>
      )}
      {tab === 'desafios' && (<>
      <Text accessibilityRole="header" className="mb-1 text-text-light dark:text-text-dark" style={typo.section}>Retos Camina</Text>
      <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-4 leading-relaxed">
        Cumple metas caminando y gana Puntos extra.
      </Text>

      {(retos ?? []).length === 0 && (
        <Text className="text-[13px] text-muted-light dark:text-muted-dark">Todavía no hay retos activos.</Text>
      )}
      <View className="gap-3">
        {(retos ?? []).map((reto) => (
          <RetoCamina
            key={reto.id}
            tone={reto.kind === 'referrals' ? 'violeta' : reto.kind === 'steps_streak' ? 'coral' : 'menta'}
            icon={
              reto.kind === 'referrals' ? (
                <IconBubble icon={Users} tone="purple" size={42} />
              ) : reto.kind === 'steps_streak' ? (
                <IconBubble icon={Flame} tone="orange" size={42} />
              ) : (
                <IconBubble icon={CheckCircle2} tone="aqua" size={42} />
              )
            }
            title={reto.title}
            description={reto.description}
            reward={reto.reward_points}
            pct={reto.pct}
            met={reto.met}
            target={reto.target}
            claimable={reto.claimable}
            claimed={reto.claimed}
            claiming={claim.isPending && claim.variables === reto.id}
            onClaim={() => handleClaim(reto)}
          />
        ))}
      </View>
      </>)}

      </ScrollView>
    </View>
  );
}
