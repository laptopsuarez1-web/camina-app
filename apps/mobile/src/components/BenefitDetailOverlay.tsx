import { useRef } from 'react';
import { Animated, PanResponder, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import type { OpeningHours } from '@/components/BusinessHours';
import { BenefitPhoto, HowToGetThere, BenefitHeader, ChannelChip, Conditions, HowToRedeem, PlaceBlock, WhatIncludes, conditionsOf } from '@/components/BenefitInfo';

// Detalle de un premio dentro de la ficha del local. Es una capa dentro de la ficha y NO otro Modal:
// en iPhone un panel abierto encima de otro dejaba la pantalla sin responder (ver las fotos del local).
type Benefit = {
  name: string;
  description?: string | null;
  discount_detail?: string | null;
  discount_percent?: number | null;
  cost_points: number;
  dine_in_only?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  valid_days_mask?: number;
  online?: boolean;
  online_channel?: string | null;
  image_url?: string | null;
};
type Business = { name: string; lat?: number | null; lng?: number | null; address?: string | null; hours_text?: string | null; opening_hours?: OpeningHours };

const STEPS_LOCAL = ['Acércate al mostrador.', 'Toca Canjear y muéstrale el código al local.', 'El local lo confirma y ¡disfruta tu premio!'];
const STEPS_ONLINE = ['Toca Canjear y guarda tu código.', 'Escríbele al local y dile el código.', '¡Disfruta tu premio!'];

export function BenefitDetailOverlay({ benefit: b, business, onClose }: { benefit: Benefit; business: Business; onClose: () => void }) {
  // Se cierra deslizando hacia abajo desde la manija (o jalando la lista hacia abajo estando arriba), además de "Entendido" y tocar el fondo.
  const dy = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismiss = () => Animated.timing(dy, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => closeRef.current());
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => dy.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80 || g.vy > 0.8) dismiss();
        else Animated.spring(dy, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;
  return (
    <Press
      accessible={false}
      feedback="none"
      onPress={onClose}
      className="justify-end"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(18,10,30,0.5)' }}
    >
      <Animated.View style={{ maxHeight: '88%', transform: [{ translateY: dy }] }}>
      <Press accessible={false} feedback="none" onPress={() => {}} className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ flexShrink: 1 }}>
        <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Cerrar. Desliza hacia abajo o toca dos veces" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={onClose} style={{ paddingTop: 4, paddingBottom: 16, marginTop: -4 }}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center" />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces onScrollEndDrag={(e) => { if (e.nativeEvent.contentOffset.y < -70) dismiss(); }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 12, gap: 22 }}>
          <BenefitPhoto url={b.image_url} cost={b.cost_points} />
          <BenefitHeader hasPhoto={!!b.image_url} title={b.name} businessName={business.name} address={business.address} cost={b.cost_points} />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}><ChannelChip b={b} /></View>
          <WhatIncludes text={b.description} />
          <HowToRedeem steps={b.online ? STEPS_ONLINE : STEPS_LOCAL} />
          <Conditions items={conditionsOf(b)} />
          <PlaceBlock benefit={b} place={business} showAddress={false} />
          <HowToGetThere place={business} />
        </ScrollView>
        <View style={{ paddingTop: 10, paddingBottom: 28 }}>
          <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center bg-aqua-deep" style={{ paddingVertical: 15 }}>
            <Text className="text-white text-[15px] font-bold">Entendido</Text>
          </Press>
        </View>
      </Press>
      </Animated.View>
    </Press>
  );
}
