import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { WeekBars } from '@/components/activity/WeekBars';
import { TrendChart } from '@/components/activity/TrendChart';
import { DayStrip, longDayLabel } from '@/components/activity/DayStrip';
import { boliviaToday } from '@/lib/bolivia';
import { colors } from '@/theme/tokens';
import { typo } from '@/theme/type';

const DIAS_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // 0=lunes
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CHART_H = 110;

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Actividad de un amigo en su perfil: la misma tarjeta de la pantalla Actividad (barras de 7 días y curva de 30 días,
// con la meta y la llama de la racha). Tocar un día lo muestra en la franja de abajo, sin "No abriste la app".
export function FriendActivityCard({ days, goal, streak }: {
  days: { day: string; steps: number; goal?: number }[];
  goal: number;
  streak: number;
}) {
  const [range, setRange] = useState<7 | 30>(7);
  const [sel, setSel] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);

  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const goalFor = (key: string) => byDay.get(key)?.goal || goal;

  const chartDays = useMemo(() => {
    const out: { key: string; steps: number; label: string; isToday: boolean }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = boliviaToday();
      d.setDate(d.getDate() - i);
      const key = localKey(d);
      out.push({ key, steps: byDay.get(key)?.steps ?? 0, label: DIAS_CORTO[(d.getDay() + 6) % 7], isToday: i === 0 });
    }
    return out;
  }, [byDay, range]);

  const total = chartDays.reduce((a, d) => a + d.steps, 0);
  const stripDay = chartDays.find((d) => d.key === sel) ?? chartDays[chartDays.length - 1];
  const scrubDay = range === 30 && scrub != null ? chartDays[scrub] : null;
  const start = (() => {
    const d = boliviaToday();
    d.setDate(d.getDate() - (range - 1));
    return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
  })();

  return (
    <LinearGradient colors={[colors.authBgSoft, colors.authBg]} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 18, padding: 18 }}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-auth-muted text-xs mb-1">{scrubDay ? longDayLabel(scrubDay.key, scrubDay.isToday) : range === 7 ? 'Últimos 7 días' : 'Últimos 30 días'}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} className="text-white" style={typo.display}>
            {(scrubDay ? scrubDay.steps : total).toLocaleString('es-BO')}
          </Text>
          <Text className="text-auth-muted text-xs mt-0.5">
            {scrubDay ? 'pasos' : `pasos · ${Math.round(total / range).toLocaleString('es-BO')} por día`}
          </Text>
        </View>
        <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          {([7, 30] as const).map((r) => (
            <Press
              key={r}
              onPress={() => { setRange(r); setSel(null); }}
              haptic="selection"
              accessibilityRole="button"
              accessibilityState={{ selected: range === r }}
              hitSlop={{ top: 9, bottom: 9 }}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: range === r ? colors.mint : 'transparent' }}
            >
              <Text className="font-bold text-[12px]" style={{ color: range === r ? colors.mintDark : colors.authMuted }}>{r} días</Text>
            </Press>
          ))}
        </View>
      </View>

      <View style={{ height: CHART_H + 40, marginTop: 14 }}>
        {range === 30 ? (
          <TrendChart values={chartDays.map((d) => d.steps)} days={chartDays} goal={goal} height={CHART_H} startLabel={start} onSelect={setSel} onScrub={setScrub} selectedKey={stripDay?.key} streakLit={streak > 0} />
        ) : (
          <WeekBars days={chartDays} goal={goal} goalFor={goalFor} height={CHART_H} selectedKey={stripDay?.key ?? null} onSelect={setSel} streakLit={streak > 0} />
        )}
      </View>
      {stripDay ? <DayStrip dayKey={stripDay.key} isToday={stripDay.isToday} steps={stripDay.steps} goal={goalFor(stripDay.key)} /> : null}
    </LinearGradient>
  );
}
