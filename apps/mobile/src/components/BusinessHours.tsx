import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Clock, ChevronDown, ChevronUp } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { Glass } from '@/components/ui/Glass';

// Un día puede tener dos tramos (horario partido): from/to y from2/to2.
type DayHours = { from: string; to: string; from2?: string; to2?: string } | null;
export type OpeningHours = Record<string, DayHours> | null | undefined;

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Índice del día de hoy con lunes = 0.
function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function inRange(now: string, from: string, to: string) {
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

// Los tramos del día, en orden: [[8:00, 12:00], [14:30, 21:00]] o uno solo si abre de corrido.
function ranges(h: NonNullable<DayHours>): [string, string][] {
  return h.from2 && h.to2 ? [[h.from, h.to], [h.from2, h.to2]] : [[h.from, h.to]];
}

function rangesText(h: NonNullable<DayHours>) {
  return ranges(h).map(([a, b]) => `${a} – ${b}`).join(' y ');
}

function isOpenNow(h: DayHours) {
  if (!h) return false;
  const now = new Date().toTimeString().slice(0, 5);
  return ranges(h).some(([a, b]) => inRange(now, a, b));
}

// Hasta qué hora está abierto en este momento (el cierre del tramo actual).
function closesAt(h: NonNullable<DayHours>) {
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
