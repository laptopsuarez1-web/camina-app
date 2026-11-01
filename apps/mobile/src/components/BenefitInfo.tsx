import { Image, Linking, Platform, View } from 'react-native';
import { Press } from '@/components/ui/Press';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { BusinessHours, type OpeningHours } from '@/components/BusinessHours';
import { IconBubble, MapPin, Storefront, ShoppingBag, GlobeIcon } from '@/components/icons';
import { plural } from '@/lib/format';

// Lo que muestran juntos el detalle de un canje y el detalle de un premio de la ficha: costo, cuándo y dónde vale, qué incluye.
export type BenefitFacts = {
  description?: string | null;
  discount_detail?: string | null;
  discount_percent?: number | null;
  dine_in_only?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  valid_days_mask?: number;
  online?: boolean;
  online_channel?: string | null;
  image_url?: string | null;
};
export type PlaceFacts = { name?: string; address?: string | null; hours_text?: string | null; opening_hours?: OpeningHours; lat?: number | null; lng?: number | null };

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CHANNEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'la página web del local',
};

// "Todos los días", "Lun a Vie" o "Lun, mié y sáb" a partir de la máscara (lunes = bit 0).
export function daysShort(mask: number) {
  const on = DIAS_CORTOS.map((_, i) => i).filter((i) => mask & (1 << i));
  if (on.length === 0 || on.length === 7) return 'Todos los días';
  if (on.length > 2 && on[on.length - 1] - on[0] === on.length - 1) return `${DIAS_CORTOS[on[0]]} a ${DIAS_CORTOS[on[on.length - 1]]}`;
  const names = on.map((i, k) => (k === 0 ? DIAS_CORTOS[i] : DIAS_CORTOS[i].toLowerCase()));
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

// Una sola línea legible: "Todos los días, todo el día" / "Lun a Vie, 9 a 18".
export function validityText(b: BenefitFacts) {
  if (b.online) return `Por ${CHANNEL[b.online_channel ?? ''] ?? 'el canal del local'}, sin horario`;
  const days = daysShort(b.valid_days_mask ?? 127);
  const from = b.valid_from?.slice(0, 5);
  const to = b.valid_to?.slice(0, 5);
  if (!from || !to) return `${days}, en el horario del local`;
  if (from === '00:00' && (to === '23:59' || to === '24:00')) return `${days}, todo el día`;
  const h = (t: string) => (t.endsWith(':00') ? String(Number(t.slice(0, 2))) : `${Number(t.slice(0, 2))}:${t.slice(3)}`);
  return `${days}, ${h(from)} a ${h(to)}`;
}

export function Chip({ icon: Icon, label, tone }: { icon: Parameters<typeof IconBubble>[0]['icon']; label: string; tone: 'aqua' | 'purple' | 'gold' | 'orange' }) {
  return (
    <Glass className="flex-row items-center rounded-full px-3 py-2" style={{ gap: 8 }}>
      <IconBubble icon={Icon} tone={tone} size={26} />
      <Text className="text-[13px] font-semibold text-text-light dark:text-text-dark">{label}</Text>
    </Glass>
  );
}

// Título grande, local y dirección a la izquierda; costo en una pastilla arriba a la derecha.
function CostPill({ cost }: { cost: number }) {
  return (
    <View className="flex-row items-center rounded-full bg-aqua-light-light dark:bg-aqua-light-dark" style={{ gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Coin size={20} />
      <Text className="text-[15px] font-bold text-aqua-ink dark:text-aqua">{cost} {plural(cost, 'Punto', 'Puntos')}</Text>
    </View>
  );
}

// Foto del premio (la que sube el comercio para ese premio, no la del local), con el costo encima.
export function BenefitPhoto({ url, cost }: { url?: string | null; cost: number }) {
  if (!url) return null;
  // La foto del premio va chica, a un costado (como en Pasito): no está pensada para ocupar todo el ancho. El costo, a la derecha.
  return (
    <View className="flex-row items-start justify-between">
      <Image accessibilityIgnoresInvertColors source={{ uri: url }} style={{ width: 168, height: 116, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }} resizeMode="cover" />
      <CostPill cost={cost} />
    </View>
  );
}

// Título grande, local y dirección; el costo va arriba a la derecha (o sobre la foto si hay foto).
export function BenefitHeader({ title, businessName, address, cost, avatar, hasPhoto }: { title: string; businessName: string; address?: string | null; cost: number; avatar?: React.ReactNode; hasPhoto?: boolean }) {
  return (
    <View>
      {hasPhoto ? null : (
        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          {avatar ?? <View />}
          <CostPill cost={cost} />
        </View>
      )}
      <Text accessibilityRole="header" className="text-[26px] font-bold text-text-light dark:text-text-dark" style={{ lineHeight: 31 }}>{title}</Text>
      <Text className="text-[14px] text-muted-light dark:text-muted-dark" style={{ marginTop: 4, lineHeight: 20 }}>
        <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{businessName}</Text>
        {address ? `  ${address}` : ''}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text className="text-[17px] font-bold text-text-light dark:text-text-dark" style={{ marginBottom: 10 }}>{children}</Text>;
}

// Los pasos para canjear, con la línea que los une.
export function HowToRedeem({ steps }: { steps: string[] }) {
  return (
    <View>
      <SectionTitle>Cómo canjear</SectionTitle>
      {steps.map((t, i) => (
        <View key={t} className="flex-row" style={{ gap: 12 }}>
          <View className="items-center">
            <View className="items-center justify-center rounded-full bg-aqua-light-light dark:bg-aqua-light-dark" style={{ width: 28, height: 28 }}>
              <Text className="text-[13px] font-bold text-aqua-ink dark:text-aqua">{i + 1}</Text>
            </View>
            {i < steps.length - 1 ? <View className="bg-line-light dark:bg-line-dark" style={{ width: 2, flex: 1, minHeight: 14 }} /> : null}
          </View>
          <Text className="flex-1 text-[14.5px] text-text-light dark:text-text-dark" style={{ paddingTop: 4, paddingBottom: i < steps.length - 1 ? 12 : 0, lineHeight: 20 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function conditionsOf(b: BenefitFacts): string[] {
  const out: string[] = [];
  if (b.online) out.push(`Se cobra por ${CHANNEL[b.online_channel ?? ''] ?? 'el canal del local'}, sin ir al local`);
  else {
    out.push(b.dine_in_only ? 'Válido solo para consumo en el local' : 'Válido en el local, para llevar o consumir');
    out.push(validityText(b));
  }
  if (b.discount_detail) out.push(b.discount_detail);
  else if (b.discount_percent) out.push(`${b.discount_percent}% de descuento`);
  return out;
}

export function Conditions({ items }: { items: string[] }) {
  return (
    <View>
      <SectionTitle>Condiciones</SectionTitle>
      <View style={{ gap: 8 }}>
        {items.map((t) => (
          <View key={t} className="flex-row" style={{ gap: 10 }}>
            <View className="rounded-full bg-aqua-deep" style={{ width: 7, height: 7, marginTop: 8 }} />
            <Text className="flex-1 text-[14.5px] text-text-light dark:text-text-dark" style={{ lineHeight: 22 }}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlaceBlock({ benefit: b, place, showAddress = true }: { benefit: BenefitFacts; place?: PlaceFacts | null; showAddress?: boolean }) {
  const hasHours = !b.online && place && (place.opening_hours || place.hours_text);
  if (!(showAddress && place?.address) && !hasHours) return null;
  return (
    <View style={{ gap: 12 }}>
      {showAddress && place?.address ? (
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <IconBubble icon={MapPin} tone="aqua" size={34} />
          <Text className="flex-1 text-[14px] text-text-light dark:text-text-dark">{place.address}</Text>
        </View>
      ) : null}
      {hasHours ? <BusinessHours openingHours={place!.opening_hours} hoursText={place!.hours_text ?? null} /> : null}
    </View>
  );
}

function openDirections(place: PlaceFacts) {
  const label = encodeURIComponent(place.name ?? place.address ?? 'Local');
  const hasPoint = typeof place.lat === 'number' && typeof place.lng === 'number';
  const web = hasPoint
    ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address ?? '')}`;
  const native = hasPoint
    ? Platform.select({ ios: `maps:0,0?q=${label}@${place.lat},${place.lng}`, android: `geo:0,0?q=${place.lat},${place.lng}(${label})` })
    : undefined;
  (native ? Linking.openURL(native) : Promise.reject()).catch(() => Linking.openURL(web).catch(() => {}));
}

// "Cómo llegar": dirección y botón que abre el mapa del teléfono. Los locales sin dirección ni ubicación no lo muestran.
export function HowToGetThere({ place }: { place?: PlaceFacts | null }) {
  if (!place || (!place.address && (typeof place.lat !== 'number' || typeof place.lng !== 'number'))) return null;
  return (
    <View>
      <SectionTitle>Cómo llegar</SectionTitle>
      <Glass className="flex-row items-center rounded-2xl px-3.5 py-3" style={{ gap: 12 }}>
        <IconBubble icon={MapPin} tone="aqua" size={38} />
        <Text className="flex-1 text-[14px] text-text-light dark:text-text-dark">{place.address ?? place.name}</Text>
        <Press accessibilityRole="link" accessibilityLabel="Ver en el mapa" onPress={() => openDirections(place)}>
          <Text className="text-[14px] font-bold text-aqua-ink dark:text-aqua">Ver en mapa</Text>
        </Press>
      </Glass>
    </View>
  );
}

export function WhatIncludes({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View>
      <SectionTitle>Qué incluye</SectionTitle>
      <Text className="text-[14.5px] text-text-light dark:text-text-dark" style={{ lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

export function ChannelChip({ b }: { b: BenefitFacts }) {
  return b.online
    ? <Chip icon={GlobeIcon} tone="aqua" label="Sin ir al local" />
    : b.dine_in_only
      ? <Chip icon={Storefront} tone="gold" label="Solo en el local" />
      : <Chip icon={ShoppingBag} tone="aqua" label="Local o para llevar" />;
}
