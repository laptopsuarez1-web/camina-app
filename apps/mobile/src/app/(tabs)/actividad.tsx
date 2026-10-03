import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Flame, IconBubble } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps } from '@/hooks/usePedometer';
import { useStreak } from '@/hooks/useStreak';
import { useCommunityAverage } from '@/hooks/useGlobalRanking';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { colors } from '@/theme/tokens';
import { dayLabel } from '@/lib/format';
import { STEP_LENGTH_METERS, KCAL_PER_STEP, MIN_DAILY_GOAL } from '@/constants/business-rules';
import { Glass } from '@/components/ui/Glass';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';

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

const CHART_H = 110;

export default function ActividadScreen() {
  const tabSpace = useTabBarSpace();
  const { steps: stepsToday } = useTodaySteps();
  const { data: history, isLoading } = useStepsHistory();
  const profile = useAuthStore((s) => s.profile);
  const { data: streak } = useStreak();
  const { data: communityAverage } = useCommunityAverage();
  const goal = Math.max(profile?.daily_goal ?? 6000, MIN_DAILY_GOAL);
  const [range, setRange] = useState<7 | 30>(7);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history ?? []) map.set(h.day, h.steps);
    map.set(localKey(new Date()), stepsToday);
    return map;
  }, [history, stepsToday]);

  const km = (stepsToday * STEP_LENGTH_METERS) / 1000;
  const kcal = Math.round(stepsToday * KCAL_PER_STEP);
  const goalPct = goal > 0 ? Math.min(100, Math.round((stepsToday / goal) * 100)) : 0;

  const weekDays = useMemo(() => {
    const days: { key: string; steps: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localKey(d);
      days.push({ key, steps: byDay.get(key) ?? 0, label: DIAS_CORTO[(d.getDay() + 6) % 7] });
    }
    return days;
  }, [byDay]);
  const weekTotal = weekDays.reduce((a, d) => a + d.steps, 0);

  const prevWeekTotal = useMemo(() => {
    let total = 0;
    for (let i = 13; i >= 7; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      total += byDay.get(localKey(d)) ?? 0;
    }
    return total;
  }, [byDay]);
  const weekTrendPct = prevWeekTotal > 0 ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null;

  const dailyDiffVsCommunity =
    communityAverage != null ? Math.round(weekTotal / 7 - Number(communityAverage) / 7) : null;

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

  // Escala con margen sobre la meta para que la línea punteada siempre se vea.
  const chartMax = Math.max(goal * 1.15, ...chartDays.map((d) => d.steps));
  const rangeTotal = chartDays.reduce((a, d) => a + d.steps, 0);

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
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <Text className="text-[21px] font-extrabold mb-3.5 text-text-light dark:text-text-dark">Actividad</Text>

      <LinearGradient
        colors={['#2f1e5c', '#241748']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ borderRadius: 18, padding: 18, marginBottom: 14 }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-auth-muted text-xs mb-1">{range === 7 ? 'Esta semana' : 'Últimos 30 días'}</Text>
            <Text className="text-white text-[30px] font-bold">{rangeTotal.toLocaleString('es-BO')}</Text>
            <Text className="text-auth-muted text-xs mt-0.5">
              pasos · {Math.round(rangeTotal / range).toLocaleString('es-BO')} por día
              {range === 7 && weekTrendPct !== null ? `  ${weekTrendPct >= 0 ? '↑' : '↓'} ${Math.abs(weekTrendPct)}% vs. la anterior` : ''}
            </Text>
          </View>
          {/* Selector 7 / 30 días dentro de la tarjeta: cambia el único gráfico de la pantalla. */}
          <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {([7, 30] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                accessibilityRole="button"
                accessibilityState={{ selected: range === r }}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: range === r ? colors.mint : 'transparent' }}
              >
                <Text className="font-bold text-[12px]" style={{ color: range === r ? colors.mintDark : colors.authMuted }}>
                  {r} días
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.mint} style={{ marginVertical: 40 }} />
        ) : (
          <View style={{ height: CHART_H + 40, marginTop: 14 }}>
            {/* Línea punteada de la meta diaria */}
            {goal <= chartMax && (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 20 + (goal / chartMax) * CHART_H, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)' }}>
                <Text className="text-[12px] text-white" style={{ position: 'absolute', left: 0, top: -18 }}>
                  meta {goal.toLocaleString('es-BO')}
                </Text>
              </View>
            )}
            <View className="flex-row items-end" style={{ gap: range === 7 ? 8 : 2, height: CHART_H + 40 }}>
              {chartDays.map((d) => {
                const hit = d.steps >= goal;
                return (
                  <View
                    key={d.key}
                    className="flex-1 items-center justify-end"
                    style={{ height: '100%' }}
                    accessible
                    accessibilityLabel={`${d.isToday ? 'Hoy' : dayLabel(d.key)}: ${d.steps.toLocaleString('es-BO')} pasos${hit ? ', meta cumplida' : ''}`}
                  >
                    {d.isToday && range === 7 ? (
                      <Text className="text-[12px] font-bold text-white mb-1">{d.steps.toLocaleString('es-BO')}</Text>
                    ) : null}
                    <View
                      style={{
                        width: '100%',
                        height: Math.max(4, (d.steps / chartMax) * CHART_H),
                        borderTopLeftRadius: range === 7 ? 8 : 3,
                        borderTopRightRadius: range === 7 ? 8 : 3,
                        borderBottomLeftRadius: 3,
                        borderBottomRightRadius: 3,
                        backgroundColor: d.isToday ? colors.mint : hit ? colors.aqua : 'rgba(79,195,168,0.4)',
                        ...(d.isToday ? { borderWidth: 1.5, borderColor: '#fff' } : {}),
                      }}
                    />
                    <Text
                      className="text-[12px] mt-1.5"
                      style={{ height: 16, color: d.isToday ? '#fff' : colors.authMuted, fontWeight: d.isToday ? '800' : '500' }}
                    >
                      {range === 7 ? (d.isToday ? 'Hoy' : d.label) : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </LinearGradient>

      {dailyDiffVsCommunity !== null && (
        <View className="flex-row items-center gap-2.5 bg-purple-light-light dark:bg-purple-light-dark rounded-2xl px-3.5 py-3 mb-3">
          <IconBubble icon={Activity} tone="purple" size={38} />
          <Text className="flex-1 text-[13px] leading-5 text-text-light dark:text-text-dark">
            {dailyDiffVsCommunity >= 0 ? (
              <>
                Tu promedio diario supera por{' '}
                <Text className="font-bold">{Math.abs(dailyDiffVsCommunity).toLocaleString('es-BO')} pasos</Text> al
                promedio de la comunidad Camina.
              </>
            ) : (
              <>
                Te faltan <Text className="font-bold">{Math.abs(dailyDiffVsCommunity).toLocaleString('es-BO')} pasos</Text>{' '}
                por día para llegar al promedio de la comunidad Camina.
              </>
            )}
          </Text>
        </View>
      )}

      {(streak ?? 0) > 0 && (
        <View className="flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3 mb-4" style={{ backgroundColor: '#FDEEE2' }}>
          <IconBubble icon={Flame} tone="orange" size={38} />
          <View className="flex-1">
            <Text className="text-[13.5px] font-bold" style={{ color: colors.warnDeep }}>¡Vas en racha!</Text>
            <Text className="text-[12px]" style={{ color: colors.warnDeep }}>{streak} {streak === 1 ? 'día seguido' : 'días seguidos'}</Text>
          </View>
        </View>
      )}

      <Text className="font-bold text-base mt-1 mb-2.5 text-text-light dark:text-text-dark">Hoy</Text>
      <Glass className="rounded-3xl p-4 mb-4">
        <View className="flex-row mb-3">
          {[
            [stepsToday.toLocaleString('es-BO'), 'pasos'],
            [km.toFixed(1).replace('.', ','), 'km'],
            [String(kcal), 'kcal'],
          ].map(([value, unit]) => (
            <View key={unit} className="flex-1">
              <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark">{value}</Text>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">{unit}</Text>
            </View>
          ))}
        </View>
        <View className="h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden mb-2">
          <View className="h-full rounded-full" style={{ width: `${goalPct}%`, backgroundColor: colors.aquaDeep }} />
        </View>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark">
          {goalPct >= 100
            ? '¡Meta del día cumplida!'
            : `${goalPct} % de tu meta · faltan ${(goal - stepsToday).toLocaleString('es-BO')} pasos`}
        </Text>
      </Glass>

      <Glass className="rounded-3xl p-4 mb-4">
        <Text className="font-bold text-[13.5px] mb-3 text-text-light dark:text-text-dark">
          {monthName[0].toUpperCase() + monthName.slice(1)} — días con objetivo cumplido
        </Text>
        <View className="flex-row justify-between mb-1.5">
          {DIAS_CORTO.map((d) => (
            <Text key={d} className="w-8 text-center text-[12px] text-muted-light dark:text-muted-dark">
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
                  className="w-8 h-8 rounded-md items-center justify-center"
                  style={{ backgroundColor: cell.met ? colors.mint : colors.light.line }}
                >
                  <Text
                    className="text-[12px] font-bold"
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
      </Glass>

      <Text className="font-bold text-base mb-2.5 text-text-light dark:text-text-dark">Toda tu actividad</Text>
      <View className="gap-2.5">
        {fullHistory.map((h) => {
          const met = h.steps >= goal;
          return (
            <Glass
              key={h.day}
              className="rounded-2xl p-3.5 flex-row items-center justify-between"
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
                style={{ color: met ? colors.aquaDeep : colors.warnDeep }}
              >
                {met ? 'Meta cumplida' : 'Meta no cumplida'}
              </Text>
            </Glass>
          );
        })}
        {!isLoading && fullHistory.length === 0 && (
          <EmptyState
            title="Tu historial empieza hoy"
            text="Abrí Inicio y caminá: tus pasos de cada día se van guardando acá para que veas cómo avanzás."
          />
        )}
      </View>
      </ScrollView>
    </View>
  );
}

