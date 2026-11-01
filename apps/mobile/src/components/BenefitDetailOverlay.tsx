import { useRef } from 'react';
import { Animated, Linking, PanResponder, ScrollView, View } from 'react-native';
import { WhatsappIcon } from '@/components/icons';
import { Glass } from '@/components/ui/Glass';
import { useColorScheme } from 'nativewind';
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
type Business = { name: string; lat?: number | null; lng?: number | null; address?: string | null; hours_text?: string | null; opening_hours?: OpeningHours; phone?: string | null };

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
  const dark = useColorScheme().colorScheme === 'dark';
  const phoneDigits = (business.phone ?? '').replace(/\D/g, '');
  const canWhatsapp = phoneDigits.length >= 7;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, justifyContent: 'flex-end' }}>
      {/* El fondo es hermano de la hoja (no su padre): así la lista de la hoja recibe el gesto de desplazar sin que otro toque se lo quite. */}
      <Press accessibilityRole="button" accessibilityLabel="Cerrar detalle" feedback="none" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18,10,30,0.5)' }} />
      <Animated.View style={{ maxHeight: '88%', transform: [{ translateY: dy }] }}>
      <Glass className="rounded-t-[28px] px-5 pt-3" style={{ flexShrink: 1, backgroundColor: dark ? 'rgba(22,16,31,0.72)' : 'rgba(255,255,255,0.74)' }}>
        <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Cerrar. Desliza hacia abajo o toca dos veces" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={onClose} style={{ paddingTop: 4, paddingBottom: 16, marginTop: -4 }}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center" />
        </View>
        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} bounces nestedScrollEnabled onScrollEndDrag={(e) => { if (e.nativeEvent.contentOffset.y < -70) dismiss(); }} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 12, gap: 22 }}>
          <BenefitPhoto url={b.image_url} cost={b.cost_points} />
          <BenefitHeader hasPhoto={!!b.image_url} title={b.name} businessName={business.name} address={business.address} cost={b.cost_points} />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}><ChannelChip b={b} /></View>
          <WhatIncludes text={b.description} />
          <HowToRedeem steps={b.online ? STEPS_ONLINE : STEPS_LOCAL} />
          <Conditions items={conditionsOf(b)} />
          {canWhatsapp ? (
            <View>
              <Text className="text-[13px] text-muted-light dark:text-muted-dark mb-2">¿Necesita reserva o coordinar horario? Eso lo define el local: escríbele por WhatsApp.</Text>
              <Press
                accessibilityRole="link"
                accessibilityLabel={`Escribir por WhatsApp a ${business.name}`}
                onPress={() => Linking.openURL(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hola, quiero coordinar mi premio "${b.name}" de Camina.`)}`)}
                className="flex-row items-center justify-center rounded-full border border-line-light dark:border-line-dark"
                style={{ gap: 8, paddingVertical: 13 }}
              >
                <WhatsappIcon size={18} color="#25D366" />
                <Text className="text-[14.5px] font-bold text-text-light dark:text-text-dark">Escribir al local por WhatsApp</Text>
              </Press>
            </View>
          ) : null}
          <PlaceBlock benefit={b} place={business} showAddress={false} />
          <HowToGetThere place={business} />
        </ScrollView>
        <View style={{ paddingTop: 10, paddingBottom: 28 }}>
          <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center bg-aqua-deep" style={{ paddingVertical: 15 }}>
            <Text className="text-white text-[15px] font-bold">Entendido</Text>
          </Press>
        </View>
      </Glass>
      </Animated.View>
    </View>
  );
}
