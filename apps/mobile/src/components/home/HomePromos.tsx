import { useState } from 'react';
import { View, ScrollView, Alert, AccessibilityInfo, Platform } from 'react-native';
import { router } from 'expo-router';
import { SectionHeader } from '@/components/home/HomeSections';
import { AdBanner, ChallengeCard, EventCard, PromoSheet } from '@/components/promos/PromoCards';
import { usePromotions, useJoinPromotion, type PromotionItem } from '@/hooks/usePromotions';
import { friendlyServerError } from '@/lib/errors';

function usePromos() {
  const { data: promos } = usePromotions();
  return { promos: promos ?? [] };
}

function usePromoSheet() {
  const { promos } = usePromos();
  const join = useJoinPromotion();
  const [openId, setOpenId] = useState<string | null>(null);
  async function onJoin(p: PromotionItem) {
    try {
      await join.mutateAsync(p.id);
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Ya estás anotado');
    } catch (e) {
      Alert.alert('No pudimos anotarte', friendlyServerError(e, 'Intenta de nuevo.'));
    }
  }
  const open = (promos ?? []).find((p) => p.id === openId) ?? null;
  return { promos, sheet: <PromoSheet p={open} onClose={() => setOpenId(null)} onJoin={onJoin} joining={join.isPending} />, setOpenId };
}

// Anuncios de marcas arriba de Inicio: fijos (no se cierran mientras estén vigentes) y con link directo.
export function HomeAdBanner() {
  const { promos } = usePromos();
  const ads = promos.filter((p) => p.kind === 'publicidad' && p.cta_url).slice(0, 2);
  if (ads.length === 0) return null;
  return (
    <View className="px-5 mt-4 mb-4" style={{ gap: 8 }}>
      {ads.map((ad) => <AdBanner key={ad.id} p={ad} />)}
    </View>
  );
}

// "Desafíos destacados" y "Eventos" de Inicio.
export function HomePromoSections() {
  const { promos, sheet, setOpenId } = usePromoSheet();
  const challenges = promos.filter((p) => p.kind === 'desafio' || p.kind === 'sorteo').slice(0, 6);
  const events = promos.filter((p) => p.kind === 'evento').slice(0, 6);
  if (challenges.length === 0 && events.length === 0) return null;
  return (
    <View className="mt-6">
      {challenges.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Desafíos destacados" actionLabel="Ver más" onAction={() => router.push({ pathname: '/(tabs)/eventos', params: { tab: 'desafios' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {challenges.map((p) => <ChallengeCard key={p.id} p={p} width={310} onPress={() => setOpenId(p.id)} />)}
          </ScrollView>
        </View>
      )}
      {events.length > 0 && (
        <View className="mb-2">
          <SectionHeader title="Eventos" actionLabel="Ver más" onAction={() => router.push({ pathname: '/(tabs)/eventos', params: { tab: 'eventos' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {events.map((p) => <EventCard key={p.id} p={p} size={270} onPress={() => setOpenId(p.id)} />)}
          </ScrollView>
        </View>
      )}
      {sheet}
    </View>
  );
}
