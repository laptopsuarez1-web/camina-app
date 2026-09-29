import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type DayHours = { from: string; to: string } | null;
export type OpeningHours = Record<string, DayHours> | null | undefined;

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Índice del día de hoy con lunes = 0.
function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function isOpenNow(h: DayHours) {
  if (!h) return false;
  const now = new Date().toTimeString().slice(0, 5);
  return h.from <= h.to ? now >= h.from && now <= h.to : now >= h.from || now <= h.to;
}

// Chip de horario que al tocarlo muestra qué días abre el comercio y en qué horario.
export function BusinessHours({ openingHours, hoursText }: { openingHours: OpeningHours; hoursText: string | null }) {
  const [open, setOpen] = useState(false);
  const today = todayIndex();
  const week = openingHours ?? null;

  // Sin horario por día (comercio viejo): se muestra el texto que cargó.
  if (!week) {
    if (!hoursText) return null;
    return (
      <View
        className="flex-row items-center bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={colors.light.muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{hoursText}</Text>
      </View>
    );
  }

  const todayHours = week[String(today)] ?? null;
  const status = todayHours
    ? isOpenNow(todayHours)
      ? `Abierto ahora · hasta ${todayHours.to}`
      : `Hoy ${todayHours.from} a ${todayHours.to}`
    : 'Hoy cerrado';

  return (
    <View className="w-full">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center self-start bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-full px-3.5 py-2"
        style={{ gap: 6 }}
      >
        <Clock size={14} color={colors.light.muted} />
        <Text className="text-[12.5px] font-semibold text-text-light dark:text-text-dark">{status}</Text>
        {open ? <ChevronUp size={14} color={colors.light.muted} /> : <ChevronDown size={14} color={colors.light.muted} />}
      </Pressable>

      {open && (
        <View className="bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-2xl px-4 py-3 mt-2" style={{ gap: 7 }}>
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
                  className="text-[13px]"
                  style={{ fontWeight: isToday ? '800' : '500', color: h ? colors.aqua : colors.light.muted }}
                >
                  {h ? `${h.from} – ${h.to}` : 'Cerrado'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
