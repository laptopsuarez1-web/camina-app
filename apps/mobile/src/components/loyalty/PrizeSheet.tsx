import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { GOLD } from '@/components/ui/Featured';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { ChevronLeft, ChevronRight, Gift, IconBubble } from '@/components/icons';
import { BenefitThumb, ChannelChip, Conditions, HowToGetThere, HowToRedeem, PlaceBlock, WhatIncludes, conditionsOf } from '@/components/BenefitInfo';
import { Countdown } from '@/components/loyalty/CaminaCardView';
import { daysLeft } from '@/hooks/useCaminaCard';
import { plural } from '@/lib/format';
import type { CaminaCard, CaminaPrizeOption } from '@/lib/database.types';
import type { OpeningHours } from '@/components/BusinessHours';

const GOLD_TEXT = '#3D2A00';

function FreePill() {
  return (
    <View className="rounded-full" style={{ backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: GOLD_TEXT }}>Gratis</Text>
    </View>
  );
}

// El premio ya elegido o uno de la lista, con el mismo detalle que el de un canje (foto, qué incluye, cómo canjear, condiciones, cómo llegar).
function PrizeDetail({ option, chosen, days }: { option: CaminaPrizeOption; chosen: boolean; days: number | null }) {
  const b = option;
  const biz = { ...option.business, opening_hours: option.business.opening_hours as OpeningHours };
  const steps = [
    'Ve al local con tu tarjeta completa.',
    'Pide el código del local y escríbelo en la app.',
    '¡Disfruta tu premio! No gastas Puntos.',
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, gap: 22 }}>
      <View className="flex-row items-start justify-between">
        <BenefitThumb url={b.image_url} size={104} />
        <FreePill />
      </View>
      <View>
        <Text accessibilityRole="header" className="text-[26px] font-bold text-text-light dark:text-text-dark" style={{ lineHeight: 31 }}>{b.benefit_name}</Text>
        <Text className="text-[14px] text-muted-light dark:text-muted-dark" style={{ marginTop: 4, lineHeight: 20 }}>
          <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{biz.name}</Text>
          {biz.address ? `  ${biz.address}` : ''}
        </Text>
      </View>

      <Glass className="flex-row items-center rounded-2xl px-3.5 py-3" style={{ gap: 12 }}>
        <IconBubble icon={Gift} tone="gold" size={38} />
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">{chosen ? 'Premio elegido' : 'Premio de tu tarjeta'}</Text>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark" style={{ marginTop: 1 }}>
            {chosen
              ? `${days !== null ? `Tienes ${days} ${plural(days, 'día', 'días')} para canjearlo en el local. ` : ''}Mientras tanto puedes cambiarlo por otro.`
              : 'Es gratis: Camina no te cobra Puntos y el comercio pone el premio.'}
          </Text>
        </View>
      </Glass>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}><ChannelChip b={b} /></View>
      <WhatIncludes text={b.description} />
      <HowToRedeem steps={steps} />
      <Conditions items={conditionsOf(b)} />
      <PlaceBlock benefit={b} place={biz} showAddress={false} />
      {!b.online ? <HowToGetThere place={biz} /> : null}
    </ScrollView>
  );
}

type View_ = { name: 'list' } | { name: 'detail'; id: string };

// "Elegir mi premio" y "Ver mi premio": la lista de premios de los comercios que participan y el detalle de cada uno.
// Se puede salir en cualquier momento; el premio elegido se puede cambiar por otro hasta que se canjea.
export function PrizeSheet(props: PrizeSheetProps) {
  // Al cerrar se desmonta: cada vez que se abre arranca en la lista (o en el premio elegido).
  return props.visible ? <PrizeSheetBody {...props} /> : null;
}

type PrizeSheetProps = {
  card: CaminaCard;
  visible: boolean;
  onClose: () => void;
  onChoose: (benefitId: string) => void;
  choosing?: boolean;
  initialId?: string | null;
  onGoToBusiness?: (businessId: string) => void;
};

function PrizeSheetBody({
  card, visible, onClose, onChoose, choosing, initialId, onGoToBusiness,
}: {
  card: CaminaCard;
  visible: boolean;
  onClose: () => void;
  onChoose: (benefitId: string) => void;
  choosing?: boolean;
  initialId?: string | null;
  onGoToBusiness?: (businessId: string) => void;
}) {
  const [view, setView] = useState<View_>(() =>
    initialId ? { name: 'detail', id: initialId } : card.chosen_benefit_id ? { name: 'detail', id: card.chosen_benefit_id } : { name: 'list' });
  const [now] = useState(() => Date.now());
  const days = daysLeft(card, now);

  const option = view.name === 'detail' ? card.options.find((o) => o.benefit_id === view.id) ?? null : null;
  const isChosen = !!option && card.chosen_benefit_id === option.benefit_id;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ maxHeight: '92%' }} onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />

          {view.name === 'list' || !option ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, gap: 12 }}>
                <View style={{ gap: 8 }}>
                  <Text accessibilityRole="header" className="text-[24px] font-bold text-text-light dark:text-text-dark">Elige tu premio</Text>
                  <Text className="text-[14px] leading-[20px] text-muted-light dark:text-muted-dark">
                    Completaste los 5 canjes. Estos comercios te regalan un premio; toca uno para ver todos los detalles.
                  </Text>
                  {days !== null ? <Countdown days={days} label={`Tienes ${days} ${plural(days, 'día', 'días')} para elegir y canjear`} /> : null}
                </View>
                {card.options.map((o) => (
                  <Press key={o.benefit_id} accessibilityRole="button" accessibilityLabel={`${o.benefit_name}, ${o.business.name}. Ver detalle`} onPress={() => setView({ name: 'detail', id: o.benefit_id })}>
                    <Glass
                      className="flex-row items-center rounded-2xl px-3.5 py-3"
                      style={[{ gap: 12 }, card.chosen_benefit_id === o.benefit_id ? { borderWidth: 2, borderColor: GOLD } : undefined]}
                    >
                      <BusinessAvatar logoUrl={o.business.logo_url} category={o.business.category} size={46} />
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-text-light dark:text-text-dark" numberOfLines={2}>{o.benefit_name}</Text>
                        <Text className="text-[13px] text-muted-light dark:text-muted-dark" numberOfLines={1}>{o.business.name}</Text>
                      </View>
                      <FreePill />
                      <ChevronRight size={16} color="#9B8DBB" />
                    </Glass>
                  </Press>
                ))}
              </ScrollView>
              <View style={{ paddingTop: 10, paddingBottom: 28 }}>
                <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center border border-line-light dark:border-line-dark" style={{ paddingVertical: 14 }}>
                  <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">Elegir más tarde</Text>
                </Press>
                <Text className="text-[12.5px] text-center text-muted-light dark:text-muted-dark" style={{ marginTop: 8 }}>
                  Tu tarjeta sigue completa. Puedes volver desde Puntos antes de que venza.
                </Text>
              </View>
            </>
          ) : (
            <>
              <Press accessibilityRole="button" accessibilityLabel="Volver a la lista" onPress={() => setView({ name: 'list' })} hitSlop={8} className="flex-row items-center self-start" style={{ gap: 4, marginBottom: 10 }}>
                <ChevronLeft size={16} color="#9B8DBB" />
                <Text className="text-[14px] font-semibold text-muted-light dark:text-muted-dark">{isChosen ? 'Cambiar de premio' : 'Todos los premios'}</Text>
              </Press>
              <PrizeDetail option={option} chosen={isChosen} days={days} />
              <View style={{ paddingTop: 10, paddingBottom: 28, gap: 8 }}>
                {isChosen ? (
                  <>
                    <Press accessibilityRole="button" onPress={() => { onClose(); onGoToBusiness?.(option.business.id); }} className="rounded-full items-center" style={{ backgroundColor: GOLD, paddingVertical: 15 }}>
                      <Text style={{ color: GOLD_TEXT, fontSize: 15, fontWeight: '800' }}>Ir a {option.business.name}</Text>
                    </Press>
                    <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center" style={{ paddingVertical: 10 }}>
                      <Text className="text-[14px] font-semibold text-muted-light dark:text-muted-dark">Cerrar</Text>
                    </Press>
                  </>
                ) : (
                  <Press accessibilityRole="button" disabled={choosing} onPress={() => onChoose(option.benefit_id)} className="rounded-full items-center" style={{ backgroundColor: GOLD, paddingVertical: 15, opacity: choosing ? 0.6 : 1 }}>
                    <Text style={{ color: GOLD_TEXT, fontSize: 15, fontWeight: '800' }}>{card.chosen_benefit_id ? 'Cambiar a este premio' : 'Elegir este premio'}</Text>
                  </Press>
                )}
              </View>
            </>
          )}
        </Press>
      </Press>
    </Modal>
  );
}
