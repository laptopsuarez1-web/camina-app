import { Modal, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { type OpeningHours } from '@/components/BusinessHours';
import { Glass } from '@/components/ui/Glass';
import { CheckCircle2, Clock, IconBubble, X } from '@/components/icons';
import { BenefitPhoto, HowToGetThere, BenefitHeader, ChannelChip, BookingChip, Conditions, HowToRedeem, PlaceBlock, WhatIncludes, conditionsOf } from '@/components/BenefitInfo';

// Detalle de un canje ya hecho (Inicio > Tus canjes): qué premio es, dónde, cuándo vale y en qué estado está.
// Los datos salen de la misma consulta de useMyRedemptions (benefit:benefits(*), business:businesses(*)).
export type RedemptionDetail = {
  id: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  cost_points: number;
  created_at: string;
  confirmed_at?: string | null;
  code?: string | null;
  code_expires_at?: string | null;
  benefit: {
    name: string;
    description?: string | null;
    discount_detail?: string | null;
    discount_percent?: number | null;
    dine_in_only?: boolean;
    valid_from?: string | null;
    valid_to?: string | null;
    valid_days_mask?: number;
    online?: boolean;
    online_channel?: string | null;
    requires_booking?: boolean;
    booking_note?: string | null;
    image_url?: string | null;
  } | null;
  business: {
    id?: string;
    name: string;
    logo_url: string | null;
    category: string;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    hours_text?: string | null;
    opening_hours?: OpeningHours;
    plan?: string | null;
  } | null;
};

function parse(iso: string) {
  return new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
}

function dateTime(iso: string) {
  const d = parse(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_STYLE: Record<RedemptionDetail['status'], { title: string; icon: typeof CheckCircle2; tone: 'aqua' | 'gold' | 'red' | 'purple' }> = {
  pending: { title: 'Pendiente', icon: Clock, tone: 'gold' },
  confirmed: { title: 'Canjeado', icon: CheckCircle2, tone: 'aqua' },
  expired: { title: 'Vencido', icon: Clock, tone: 'red' },
  cancelled: { title: 'Cancelado', icon: X, tone: 'purple' },
};

export function RedemptionDetailSheet({
  redemption, onClose, onOpenBusiness,
}: { redemption: RedemptionDetail | null; onClose: () => void; onOpenBusiness: (businessId: string) => void }) {
  const r = redemption;
  const b = r?.benefit ?? null;
  const biz = r?.business ?? null;

  const st = r ? STATUS_STYLE[r.status] : null;
  const steps = ['Muéstrale el código al local.', 'El local lo confirma con su PIN.', '¡Disfruta tu premio!'];

  return (
    <Modal visible={!!r} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ maxHeight: '90%' }} onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          {r && st ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, gap: 22 }}>
                <BenefitPhoto url={b?.image_url} cost={r.cost_points} />
                <BenefitHeader
                  hasPhoto={!!b?.image_url}
                  title={b?.name ?? 'Premio'}
                  businessName={biz?.name ?? 'Comercio'}
                  address={biz?.address}
                  cost={r.cost_points}
                  avatar={b?.image_url ? undefined : <BusinessAvatar logoUrl={biz?.logo_url} category={biz?.category} size={56} />}
                />

                <Glass className="flex-row items-center rounded-2xl px-3.5 py-3" style={{ gap: 12 }}>
                  <IconBubble icon={st.icon} tone={st.tone} size={38} />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">{st.title}</Text>
                    <Text className="text-[13px] text-muted-light dark:text-muted-dark" style={{ marginTop: 1 }}>
                      {r.status === 'confirmed' && r.confirmed_at ? `El local lo confirmó el ${dateTime(r.confirmed_at)}`
                        : r.status === 'pending' ? 'Muestra el código en el local para que lo confirmen.'
                        : r.status === 'expired' ? 'El código no se usó a tiempo.'
                        : 'Te devolvimos los Puntos.'}
                    </Text>
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark" style={{ marginTop: 2 }}>Canjeado el {dateTime(r.created_at)}</Text>
                  </View>
                </Glass>

                {r.status === 'pending' && r.code && r.code_expires_at && parse(r.code_expires_at).getTime() > Date.now() ? (
                  <View className="rounded-2xl items-center bg-aqua-deep" style={{ paddingVertical: 14 }}>
                    <Text className="text-white text-[30px] font-bold" style={{ letterSpacing: 5 }}>{r.code.slice(0, 3)} {r.code.slice(3)}</Text>
                    <Text className="text-white text-[12.5px]">Vale hasta las {parse(r.code_expires_at).toTimeString().slice(0, 5)}</Text>
                  </View>
                ) : null}

                {b ? <View className="flex-row flex-wrap" style={{ gap: 8 }}><ChannelChip b={b} /><BookingChip b={b} /></View> : null}
                <WhatIncludes text={b?.description} />
                {r.status === 'pending' ? <HowToRedeem steps={steps} /> : null}
                {b ? <Conditions items={conditionsOf(b)} /> : null}
                {b ? <PlaceBlock benefit={b} place={biz} showAddress={false} /> : null}
                {b && !b.online ? <HowToGetThere place={biz} /> : null}
              </ScrollView>
              <View style={{ paddingTop: 10, paddingBottom: 28 }}>
                {biz?.id ? (
                  <Press accessibilityRole="button" onPress={() => { onClose(); onOpenBusiness(biz.id!); }} className="rounded-full items-center bg-aqua-deep" style={{ paddingVertical: 15 }}>
                    <Text className="text-white text-[15px] font-bold">Ver el local</Text>
                  </Press>
                ) : (
                  <Press accessibilityRole="button" onPress={onClose} className="rounded-full items-center bg-aqua-deep" style={{ paddingVertical: 15 }}>
                    <Text className="text-white text-[15px] font-bold">Cerrar</Text>
                  </Press>
                )}
              </View>
            </>
          ) : null}
        </Press>
      </Press>
    </Modal>
  );
}
