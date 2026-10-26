import { Modal, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { BusinessHours, type OpeningHours } from '@/components/BusinessHours';
import { plural } from '@/lib/format';

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
  } | null;
  business: {
    id?: string;
    name: string;
    logo_url: string | null;
    category: string;
    address?: string | null;
    hours_text?: string | null;
    opening_hours?: OpeningHours;
    plan?: string | null;
  } | null;
};

const STATUS_TEXT: Record<RedemptionDetail['status'], string> = {
  pending: 'Pendiente: mostrá el código en el local para que lo confirmen.',
  confirmed: 'Canjeado: el local ya lo confirmó.',
  expired: 'Vencido: el código no se usó a tiempo.',
  cancelled: 'Cancelado: te devolvimos los Puntos.',
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CHANNEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'la página web del local',
};

function parse(iso: string) {
  return new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
}

function dateTime(iso: string) {
  const d = parse(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "Todos los días" / "Lunes, martes y viernes" a partir de la máscara (lunes = bit 0).
function daysText(mask: number) {
  const on = DIAS.filter((_, i) => mask & (1 << i));
  if (on.length === 0 || on.length === 7) return 'Todos los días';
  const names = on.map((d, i) => (i === 0 ? d : d.toLowerCase()));
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-t border-line-light dark:border-line-dark">
      <Text className="text-[12px] text-muted-light dark:text-muted-dark">{label}</Text>
      <Text className="text-[14.5px] font-semibold text-text-light dark:text-text-dark" style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export function RedemptionDetailSheet({
  redemption, onClose, onOpenBusiness,
}: { redemption: RedemptionDetail | null; onClose: () => void; onOpenBusiness: (businessId: string) => void }) {
  const r = redemption;
  const b = r?.benefit ?? null;
  const biz = r?.business ?? null;

  const rows: { label: string; value: string }[] = [];
  if (r && b) {
    if (b.description) rows.push({ label: 'Qué incluye', value: b.description });
    if (b.discount_detail) rows.push({ label: 'Detalle del descuento', value: b.discount_detail });
    else if (b.discount_percent) rows.push({ label: 'Descuento', value: `${b.discount_percent}%` });
    if (b.online) {
      rows.push({ label: 'Cómo se cobra', value: `Por ${CHANNEL[b.online_channel ?? ''] ?? 'el canal del local'}, sin ir al local ni horario.` });
    } else {
      rows.push({ label: 'Días en que vale', value: daysText(b.valid_days_mask ?? 127) });
      rows.push({
        label: 'Horario del premio',
        value: b.valid_from && b.valid_to ? `De ${b.valid_from.slice(0, 5)} a ${b.valid_to.slice(0, 5)}` : 'Durante todo el horario del local',
      });
      rows.push({ label: 'Dónde vale', value: b.dine_in_only ? 'Solo consumiendo en el local' : 'En el local, para llevar o consumir' });
    }
  }

  return (
    <Modal visible={!!r} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ maxHeight: '88%' }} onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          {r ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <BusinessAvatar logoUrl={biz?.logo_url} category={biz?.category} size={52} />
                <View className="flex-1 min-w-0">
                  <Text accessibilityRole="header" className="text-[17px] font-bold text-text-light dark:text-text-dark">{b?.name ?? 'Premio'}</Text>
                  <Text className="text-[13px] text-muted-light dark:text-muted-dark">{biz?.name ?? 'Comercio'}</Text>
                </View>
              </View>

              <Text className="text-[13.5px] text-text-light dark:text-text-dark" style={{ marginTop: 14, marginBottom: 6 }}>{STATUS_TEXT[r.status]}</Text>

              {r.status === 'pending' && r.code && r.code_expires_at && parse(r.code_expires_at).getTime() > Date.now() ? (
                <View className="rounded-2xl items-center bg-aqua-deep" style={{ paddingVertical: 12, marginVertical: 8 }}>
                  <Text className="text-white text-[26px] font-bold" style={{ letterSpacing: 4 }}>{r.code.slice(0, 3)} {r.code.slice(3)}</Text>
                  <Text className="text-white text-[12px]">Vale hasta las {parse(r.code_expires_at).toTimeString().slice(0, 5)}</Text>
                </View>
              ) : null}

              <Row label="Canjeado el" value={dateTime(r.created_at)} />
              {r.confirmed_at ? <Row label="Confirmado por el local el" value={dateTime(r.confirmed_at)} /> : null}
              <Row label="Costo" value={`${r.cost_points} ${plural(r.cost_points, 'Punto', 'Puntos')}`} />
              {rows.map((x) => <Row key={x.label} label={x.label} value={x.value} />)}
              {biz?.address ? <Row label="Dirección" value={biz.address} /> : null}

              {biz && !b?.online && (biz.opening_hours || biz.hours_text) ? (
                <View className="border-t border-line-light dark:border-line-dark" style={{ paddingTop: 12 }}>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark" style={{ marginBottom: 6 }}>Horario del local</Text>
                  <BusinessHours openingHours={biz.opening_hours} hoursText={biz.hours_text ?? null} />
                </View>
              ) : null}

              {biz?.id ? (
                <Press
                  accessibilityRole="button"
                  onPress={() => { onClose(); onOpenBusiness(biz.id!); }}
                  className="rounded-full items-center bg-aqua-deep"
                  style={{ paddingVertical: 14, marginTop: 18 }}
                >
                  <Text className="text-white text-[15px] font-bold">Ver el local</Text>
                </Press>
              ) : null}
              <Press accessibilityRole="button" onPress={onClose} className="items-center" style={{ paddingVertical: 14 }}>
                <Text className="text-[15px] text-muted-light dark:text-muted-dark">Cerrar</Text>
              </Press>
            </ScrollView>
          ) : null}
        </Press>
      </Press>
    </Modal>
  );
}
