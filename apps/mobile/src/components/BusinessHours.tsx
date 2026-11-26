import { useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Clock, ChevronDown, ChevronUp } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { Glass } from '@/components/ui/Glass';

// Un día puede tener dos tramos (horario partido): from/to y from2/to2.
type DayHours = { from: string; to: string; from2?: string; to2?: string } | null;
export type OpeningHours = Record<string, DayHours> | null | undefined;

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Índice del día de hoy con lunes = 0.
export function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function inRange(now: string, from: string, to: string) {
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

// Los tramos del día, en orden: [[8:00, 12:00], [14:30, 21:00]] o uno solo si abre de corrido.
function ranges(h: NonNullable<DayHours>): [string, string][] {
  return h.from2 && h.to2 ? [[h.from, h.to], [h.from2, h.to2]] : [[h.from, h.to]];
}

export function rangesText(h: NonNullable<DayHours>) {
  return ranges(h).map(([a, b]) => `${a} – ${b}`).join(' y ');
}

export function isOpenNow(h: DayHours) {
  if (!h) return false;
  const now = new Date().toTimeString().slice(0, 5);
  return ranges(h).some(([a, b]) => inRange(now, a, b));
}

// Hasta qué hora está abierto en este momento (el cierre del tramo actual).
export function closesAt(h: NonNullable<DayHours>) {
  const now = new Date().toTimeString().slice(0, 5);
  return (ranges(h).find(([a, b]) => inRange(now, a, b)) ?? ranges(h)[0])[1];
}

// Chip de horario que al tocarlo muestra qué días abre el comercio y en qué horario.
export function BusinessHours({ openingHours, hoursText }: { openingHours: OpeningHours; hoursText: string | null }) {
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();
  const today = todayIndex();
  const week = openingHours ?? null;

  // Sin horario por día (comercio viejo): se muestra el texto que cargó.
  if (!week) {
    if (!hoursText) return null;
    return (
      <Glass
        className="flex-row items-center rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{hoursText}</Text>
      </Glass>
    );
  }

  const todayHours = week[String(today)] ?? null;
  const status = todayHours
    ? isOpenNow(todayHours)
      ? `Abierto ahora · hasta ${closesAt(todayHours)}`
      : `Hoy ${rangesText(todayHours).replace(/ – /g, ' a ')}`
    : 'Hoy cerrado';

  return (
    <View className="w-full">
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        hitSlop={{ top: 6, bottom: 6 }}
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center self-start bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{status}</Text>
        {open ? <ChevronUp size={14} color={muted} /> : <ChevronDown size={14} color={muted} />}
      </Press>

      {open && (
        <Glass className="rounded-2xl px-4 py-3 mt-2" style={{ gap: 7 }}>
          {DAYS.map((name, i) => {
            const h = week[String(i)] ?? null;
            const isToday = i === today;
            return (
              <View key={name} className="flex-row items-center justify-between">
                <Text
                  className="text-[13px] text-text-light dark:text-text-dark"
                  style={{ fontWeight: isToday ? '800' : '500' }}
                >
                  {name}
                  {isToday ? ' (hoy)' : ''}
                </Text>
                <Text
                  className={h ? 'text-[13px] text-aqua-ink dark:text-aqua' : 'text-[13px] text-muted-light dark:text-muted-dark'}
                  style={{ fontWeight: isToday ? '800' : '500' }}
                >
                  {h ? rangesText(h) : 'Cerrado'}
                </Text>
              </View>
            );
          })}
        </Glass>
      )}
    </View>
  );
}

// Texto del chip sobre la portada: "ABIERTO · 10:00 – 23:00" (el tramo en curso) o "CERRADO · Hoy 08:00 – 23:00".
export function hoursChipInfo(week: NonNullable<OpeningHours>) {
  const h = week[String(todayIndex())] ?? null;
  if (!h) return { open: false, text: 'CERRADO HOY' };
  if (isOpenNow(h)) {
    const now = new Date().toTimeString().slice(0, 5);
    const r = ranges(h).find(([a, b]) => inRange(now, a, b)) ?? ranges(h)[0];
    return { open: true, text: `ABIERTO · ${r[0]} – ${r[1]}` };
  }
  return { open: false, text: `CERRADO · HOY ${rangesText(h)}` };
}

// Chip de horario sobre la foto de portada (estilo Pasito). Al tocarlo se abre la hoja con los 7 días.
// Va a 46 px del borde: más abajo lo tapa la ficha (que sube 36 px sobre la portada) y no se puede tocar.
export function HoursCoverChip({ openingHours, onPress }: { openingHours: NonNullable<OpeningHours>; onPress: () => void }) {
  const { open, text } = hoursChipInfo(openingHours);
  const fg = open ? '#12281F' : '#FFFFFF';
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${text}. Ver todos los horarios`}
      onPress={onPress}
      className="absolute flex-row items-center rounded-full"
      style={{ right: 16, bottom: 46, gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: open ? '#62F0B6' : 'rgba(18,10,30,0.78)' }}
    >
      <Text allowFontScaling={false} style={{ color: fg, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.3 }}>{text}</Text>
      <ChevronDown size={14} color={fg} />
    </Press>
  );
}

// Hoja inferior "Horarios": los 7 días en lista limpia y el de hoy resaltado.
export function HoursSheet({ openingHours, visible, onClose }: { openingHours: NonNullable<OpeningHours>; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const today = todayIndex();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.55)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" onPress={() => {}} style={{ backgroundColor: '#1d1729', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#5c4f80', alignSelf: 'center', marginTop: 10 }} />
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Horarios</Text>
            {DAYS.map((name, i) => {
              const h = openingHours[String(i)] ?? null;
              const isToday = i === today;
              return (
                <View
                  key={name}
                  className="flex-row items-center justify-between"
                  style={{ paddingVertical: 11, paddingHorizontal: isToday ? 12 : 0, marginHorizontal: isToday ? -12 : 0, borderRadius: 14, backgroundColor: isToday ? 'rgba(98,240,182,0.14)' : 'transparent' }}
                >
                  <Text style={{ color: isToday ? '#62F0B6' : '#fff', fontSize: 15, fontWeight: isToday ? '800' : '500' }}>{name}{isToday ? ' (hoy)' : ''}</Text>
                  <Text style={{ color: isToday ? '#62F0B6' : h ? '#fff' : '#9a8cb8', fontSize: 15, fontWeight: isToday ? '800' : '500' }}>{h ? rangesText(h) : 'Cerrado'}</Text>
                </View>
              );
            })}
          </View>
        </Press>
      </Press>
    </Modal>
  );
}
