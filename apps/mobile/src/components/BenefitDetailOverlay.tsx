import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { BusinessHours, type OpeningHours } from '@/components/BusinessHours';
import { plural } from '@/lib/format';

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

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CHANNEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'la página web del local',
};

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

export function BenefitDetailOverlay({ benefit: b, business, onClose }: { benefit: Benefit; business: Business; onClose: () => void }) {
  const rows: { label: string; value: string }[] = [];
  if (b.description) rows.push({ label: 'Qué incluye', value: b.description });
  if (b.discount_detail) rows.push({ label: 'Detalle del descuento', value: b.discount_detail });
  else if (b.discount_percent) rows.push({ label: 'Descuento', value: `${b.discount_percent}%` });
  rows.push({ label: 'Costo', value: `${b.cost_points} ${plural(b.cost_points, 'Punto', 'Puntos')}` });
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
  if (business.address) rows.push({ label: 'Dirección', value: business.address });

  return (
    <Press
      accessible={false}
      feedback="none"
      onPress={onClose}
      className="justify-end"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10, backgroundColor: 'rgba(18,10,30,0.5)' }}
    >
      <Press accessible={false} feedback="none" onPress={() => {}} className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3" style={{ maxHeight: '85%' }}>
        <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <Text accessibilityRole="header" className="text-[18px] font-bold text-text-light dark:text-text-dark">{b.name}</Text>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark" style={{ marginBottom: 10 }}>{business.name}</Text>
          {rows.map((x) => <Row key={x.label} label={x.label} value={x.value} />)}
          {!b.online && (business.opening_hours || business.hours_text) ? (
            <View className="border-t border-line-light dark:border-line-dark" style={{ paddingTop: 12 }}>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark" style={{ marginBottom: 6 }}>Horario del local</Text>
              <BusinessHours openingHours={business.opening_hours} hoursText={business.hours_text ?? null} />
            </View>
          ) : null}
          <Press accessibilityRole="button" onPress={onClose} className="items-center" style={{ paddingVertical: 16 }}>
            <Text className="text-[15px] font-semibold text-aqua-ink dark:text-aqua">Cerrar</Text>
          </Press>
        </ScrollView>
      </Press>
    </Press>
  );
}
