import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import type { OpeningHours } from '@/components/BusinessHours';
import { BenefitHeader, ChannelChip, Conditions, HowToRedeem, PlaceBlock, WhatIncludes, conditionsOf } from '@/components/BenefitInfo';

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
};
type Business = { name: string; address?: string | null; hours_text?: string | null; opening_hours?: OpeningHours };

const STEPS_LOCAL = ['Acercate al mostrador.', 'Tocá Canjear y mostrale el código al local.', 'El local lo confirma y ¡disfrutá tu premio!'];
const STEPS_ONLINE = ['Tocá Canjear y guardá tu código.', 'Escribile al local y decile el código.', '¡Disfrutá tu premio!'];

export function BenefitDetailOverlay({ benefit: b, business, onClose }: { benefit: Benefit; business: Business; onClose: () => void }) {
  return (
    <Press
      accessible={false}
      feedback="none"
      onPress={onClose}
      className="justify-end"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(18,10,30,0.5)' }}
    >
      <Press accessible={false} feedback="none" onPress={() => {}} className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ maxHeight: '88%' }}>
        <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, gap: 22 }}>
          <BenefitHeader title={b.name} businessName={business.name} address={business.address} cost={b.cost_points} />
          <View className="flex-row flex-wrap" style={{ gap: 8 }}><ChannelChip b={b} /></View>
          <WhatIncludes text={b.description} />
          <HowToRedeem steps={b.online ? STEPS_ONLINE : STEPS_LOCAL} />
          <Conditions items={conditionsOf(b)} />
          <PlaceBlock benefit={b} place={business} showAddress={false} />
        </ScrollView>
        <View style={{ paddingTop: 10, paddingBottom: 28 }}>
          <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center bg-aqua-deep" style={{ paddingVertical: 15 }}>
            <Text className="text-white text-[15px] font-bold">Entendido</Text>
          </Press>
        </View>
      </Press>
    </Press>
  );
}
