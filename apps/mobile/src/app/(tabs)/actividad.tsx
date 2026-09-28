import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps } from '@/hooks/usePedometer';
import { colors } from '@/theme/tokens';
import { dayLabel } from '@/lib/format';
import { STEP_LENGTH_METERS, KCAL_PER_STEP } from '@/constants/business-rules';

const DIAS_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // 0=lunes

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useStepsHistory() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['steps-history-full', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 34);
      const { data, error } = await supabase
        .from('steps_daily')
        .select('day, steps')
        .eq('user_id', userId!)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function ActividadScreen() {
  const { steps: stepsToday } = useTodaySteps();
  const { data: history, isLoading } = useStepsHistory();
  const profile = useAuthStore((s) => s.profile);
  const goal = profile?.daily_goal ?? 6000;
  const [range, setRange] = useState<7 | 30>(7);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history ?? []) map.set(h.day, h.steps);
    map.set(localKey(new Date()), stepsToday);
    return map;
  }, [history, stepsToday]);

  const km = (stepsToday * STEP_LENGTH_METERS) / 1000;
  const kcal = Math.round(stepsToday * KCAL_PER_STEP);

  const chartDays = useMemo(() => {
    const days: { key: string; steps: number; label: string; isToday: boolean }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localKey(d);
      days.push({
        key,
        steps: byDay.get(key) ?? 0,
        label: DIAS_CORTO[(d.getDay() + 6) % 7],
        isToday: i === 0,
      });
    }
    return days;
  }, [byDay, range]);

  const maxSteps = Math.max(1, ...chartDays.map((d) => d.steps));

  const calendarWeeks = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: ({ day: number; key: string; met: boolean } | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = localKey(new Date(year, month, day));
      cells.push({ day, key, met: (byDay.get(key) ?? 0) >= goal });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [byDay, goal]);

  const monthName = new Date().toLocaleDateString('es-BO', { month: 'long' });

  const fullHistory = useMemo(() => [...(history ?? [])].reverse(), [history]);

  return (
    <ScrollView className="flex-1 bg-bg-light dark:bg-bg-dark" contentContainerClassName="p-5 pt-14 pb-10">
      <Text className="text-[21px] font-extrabold mb-4 text-text-light dark:text-text-dark">Actividad</Text>

      <View className="flex-row gap-2.5 mb-4">
        <StatCard label="Hoy" value={stepsToday.toLocaleString('es-BO')} unit="pasos" color={colors.aqua} />
        <StatCard label="Km hoy" value={km.toFixed(1)} unit="km" color={colors.purple} />
        <StatCard label="Calorías" value={String(kcal)} unit="kcal" color={colors.warn} />
      </View>

      <View className="flex-row bg-card-light dark:bg-card-dark rounded-full p-1 mb-4">
        {([7, 30] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            className="flex-1 rounded-full py-2.5 items-center"
            style={{ backgroundColor: range === r ? colors.aqua : 'transparent' }}
          >
            <Text
              className="font-bold text-[13px]"
              style={{ color: range === r ? '#fff' : colors.light.muted }}
            >
              {r} días
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.aqua} style={{ marginBottom: 16 }} />
      ) : (
        <View className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mb-4">
          <View className="flex-row items-end gap-1.5" style={{ height: 90 }}>
            {chartDays.map((d) => (
              <View key={d.key} className="flex-1 items-center gap-1">
                <View
                  className="w-full rounded-md"
                  style={{
                    height: Math.max(4, (d.steps / maxSteps) * 70),
                    backgroundColor: d.isToday ? colors.warn : colors.aqua,
                  }}
                />
                {range === 7 && (
                  <Text className="text-[10px] text-muted-light dark:text-muted-dark">{d.label}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="bg-card-light dark:bg-card-dark rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[13.5px] mb-3 text-text-light dark:text-text-dark">
          {monthName[0].toUpperCase() + monthName.slice(1)} — días con objetivo cumplido
        </Text>
        <View className="flex-row justify-between mb-1.5">
          {DIAS_CORTO.map((d) => (
            <Text key={d} className="w-8 text-center text-[10px] text-muted-light dark:text-muted-dark">
              {d}
            </Text>
          ))}
        </View>
        {calendarWeeks.map((week, i) => (
          <View key={i} className="flex-row justify-between mb-1.5">
            {week.map((cell, j) =>
              cell ? (
                <View
                  key={cell.key}
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: cell.met ? colors.mint : colors.light.line }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: cell.met ? colors.mintDark : colors.light.muted }}
                  >
                    {cell.day}
                  </Text>
                </View>
              ) : (
                <View key={`empty-${i}-${j}`} className="w-8 h-8" />
              )
            )}
          </View>
        ))}
      </View>

      <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">Toda tu actividad</Text>
      <View className="gap-2.5">
        {fullHistory.map((h) => {
          const met = h.steps >= goal;
          return (
            <View
              key={h.day}
              className="bg-card-light dark:bg-card-dark rounded-2xl p-3.5 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark">
                  {dayLabel(h.day)}
                </Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">
                  {h.steps.toLocaleString('es-BO')} pasos
                </Text>
              </View>
              <Text
                className="text-[12px] font-bold"
                style={{ color: met ? '#2E9E7C' : colors.warn }}
              >
                {met ? 'Meta cumplida' : 'Meta no cumplida'}
              </Text>
            </View>
          );
        })}
        {!isLoading && fullHistory.length === 0 && (
          <Text className="text-muted-light dark:text-muted-dark text-[13px]">
            Todavía no hay historial — sincronizá pasos desde Inicio.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View className="flex-1 bg-card-light dark:bg-card-dark rounded-2xl p-3">
      <Text className="text-[11px] text-muted-light dark:text-muted-dark mb-1">{label}</Text>
      <Text className="text-[15px] font-extrabold text-text-light dark:text-text-dark mb-2">
        {value} <Text className="text-[10.5px] font-semibold text-muted-light dark:text-muted-dark">{unit}</Text>
      </Text>
      <View className="h-1 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}
