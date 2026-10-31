import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { IconBubble, Activity } from '@/components/icons';
import { TrendChart, type TrendSeries } from '@/components/activity/TrendChart';
import { useGroupTrend } from '@/hooks/useGroupDetail';
import { lastDaysSeries } from '@/lib/trend';
import { colors } from '@/theme/tokens';

// Colores de las líneas: "Tú" siempre en verde; el resto, tonos bien distintos entre sí (también para daltonismo: violeta, ámbar, azul).
const OTHERS = ['#A78BFA', '#F5B84B', '#5BA8F5', '#F58BB7'];
const MAX_LINES = 4;

// Pantalla del grupo: comparar los últimos 30 días de pasos con las demás personas del grupo (como "Tendencia del grupo" de Pasito).
export function GroupTrendCard({ groupId, userId, members }: { groupId: string; userId: string | undefined; members: { id: string; name: string }[] }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  const { data: rows } = useGroupTrend(groupId);
  const others = members.filter((m) => m.id !== userId);
  // Por defecto: tú y la persona que más camina; se pueden sumar hasta 3 más.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const active = chosen ?? others.slice(0, 1).map((m) => m.id);

  const days = useMemo(() => lastDaysSeries(30, new Map()).map((d) => d.key), []);
  const series = useMemo(() => {
    const byUser = new Map<string, Map<string, number>>();
    for (const r of rows ?? []) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
      byUser.get(r.user_id)!.set(r.day, r.steps);
    }
    const make = (id: string, label: string, color: string): TrendSeries => ({
      id, label, color, values: lastDaysSeries(30, byUser.get(id) ?? new Map()).map((d) => d.steps),
    });
    const list = [make(userId ?? 'yo', 'Tú', isDark ? colors.mint : colors.aquaDeep)];
    active.forEach((id, i) => {
      const m = others.find((o) => o.id === id);
      if (m) list.push(make(id, m.name, OTHERS[i % OTHERS.length]));
    });
    return list;
  }, [rows, active, others, userId, isDark]);

  // Sin la función en la base, sin datos o sin nadie más con quién comparar: no se muestra.
  if (!rows || others.length === 0) return null;

  function toggle(id: string) {
    const next = active.includes(id) ? active.filter((x) => x !== id) : active.length >= MAX_LINES - 1 ? active : [...active, id];
    setChosen(next);
  }

  return (
    <Glass className="mx-5 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center mb-1" style={{ gap: 10 }}>
        <IconBubble icon={Activity} tone="purple" size={34} />
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-text-light dark:text-text-dark">Tendencia del grupo</Text>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark">Últimos 30 días</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap mt-2 mb-3" style={{ gap: 8 }}>
        {others.map((m) => {
          const i = active.indexOf(m.id);
          const on = i >= 0;
          return (
            <Press
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${on ? 'Quitar' : 'Comparar con'} ${m.name}`}
              accessibilityState={{ selected: on }}
              aria-pressed={on}
              haptic="selection"
              onPress={() => toggle(m.id)}
              className="flex-row items-center rounded-full border px-3 bg-card-light dark:bg-card-dark border-line-light dark:border-line-dark"
              style={{ gap: 6, minHeight: 40, ...(on ? { borderColor: OTHERS[i % OTHERS.length], borderWidth: 1.5 } : null) }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? OTHERS[i % OTHERS.length] : (isDark ? colors.dark.line : colors.light.line) }} />
              <Text numberOfLines={1} className="text-[12.5px] font-semibold text-text-light dark:text-text-dark" style={{ maxWidth: 120 }}>{m.name}</Text>
            </Press>
          );
        })}
      </View>
      <TrendChart
        days={days}
        series={series}
        muted={isDark ? colors.dark.muted : colors.light.muted}
        textColor={isDark ? colors.dark.text : colors.light.text}
        gridColor={isDark ? colors.dark.line : colors.light.line}
      />
    </Glass>
  );
}
