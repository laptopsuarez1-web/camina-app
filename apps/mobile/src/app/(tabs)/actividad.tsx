import { useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { EmptyState } from '@/components/ui/EmptyState';
import { View, ScrollView, Modal, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, IconBubble, ChevronUp, ChevronDown, ChevronRight, Share2, Sparkle } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTodaySteps, useHealthDailySteps } from '@/hooks/usePedometer';
import { useStreak } from '@/hooks/useStreak';
import { StreakCard } from '@/components/activity/StreakCard';
import { celebrate } from '@/store/useCelebrationStore';
import { useCommunityAverage, useMyWeeklyRank } from '@/hooks/useGlobalRanking';
import { HeaderLight } from '@/components/ui/HeaderLight';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { dayLabel } from '@/lib/format';
import { calendarDayState, type CalendarState } from '@/lib/activity-calendar';
import { STEP_LENGTH_METERS, KCAL_PER_STEP, MIN_DAILY_GOAL, STREAK_BONUS_DAYS } from '@/constants/business-rules';
import { Glass } from '@/components/ui/Glass';
import { GrowIn } from '@/components/ui/GrowIn';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { typo } from '@/theme/type';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { ResumenShareSheet } from '@/components/share/ResumenShareSheet';
import { WrappedViewer } from '@/components/share/WrappedViewer';
import { useWrapped, wrappedMonthStart } from '@/hooks/useWrapped';
import { scheduleWrappedReminder } from '@/lib/wrapped-reminder';
import { monthName as wrappedMonthName } from '@/lib/share-stats';

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
        .select('day, steps, goal')
        .eq('user_id', userId!)
        .gte('day', localKey(since))
        .order('day', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const CHART_H = 110;

// Colores del calendario: verde (abrió la app y cumplió), rojo (abrió la app y no llegó), gris (no abrió la app).
const CAL_BG = { met: colors.mint, miss: '#F4A8A2', idle: '#D3D3DA', none: colors.light.line };
const CAL_FG = { met: colors.mintDark, miss: '#7A1510', idle: '#45454F', none: colors.light.muted };

export default function ActividadScreen() {
  const isDark = useColorScheme().colorScheme === 'dark';
  // Textos de color (estado de la meta, "Cerrar") con su par para oscuro.
  const { accentText, warnText, purpleText } = useThemeColors();
  const tabSpace = useTabBarSpace();
  const { steps: stepsToday } = useTodaySteps();
  const healthDaily = useHealthDailySteps(35);
  const { data: history, isLoading } = useStepsHistory();
  const profile = useAuthStore((s) => s.profile);
  const { data: streak } = useStreak();
  const queryClient = useQueryClient();
  const claimTried = useRef(false);

  // Cada 7 días seguidos, +5 Puntos: el servidor cobra los bloques completos una sola vez (idempotente).
  // Si todavía no está la función en la base, el error se ignora y la tarjeta funciona igual.
  useEffect(() => {
    if (claimTried.current || streak === undefined || streak < STREAK_BONUS_DAYS) return;
    claimTried.current = true;
    supabase.rpc('claim_streak_bonus').then(({ data, error }) => {
      const pts = Number(data ?? 0);
      if (error || !pts) return;
      celebrate({ kind: 'sheet', title: '¡7 días seguidos!', body: 'Cumpliste tu meta una semana entera.', points: pts, cta: 'Seguir caminando' });
      for (const key of ['points-balance', 'points-ledger']) queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [streak, queryClient]);
  const { data: communityAverage } = useCommunityAverage();
  const { data: myRank } = useMyWeeklyRank();
  const [shareOpen, setShareOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  // Los primeros días del mes se ofrece el Wrapped del mes que terminó (solo si hubo pasos).
  const wrappedStart = useMemo(() => wrappedMonthStart(), []);
  const { data: wrapped } = useWrapped(wrappedStart);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null;
  useEffect(() => {
    scheduleWrappedReminder();
  }, []);
  const goal = Math.max(profile?.daily_goal ?? 6000, MIN_DAILY_GOAL);
  const [range, setRange] = useState<7 | 30>(7);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history ?? []) map.set(h.day, h.steps);
    // Salud guarda los pasos de los días en que no abriste la app: se muestran acá, pero no suman Puntos.
    for (const [k, v] of Object.entries(healthDaily)) map.set(k, Math.max(map.get(k) ?? 0, v));
    map.set(localKey(new Date()), stepsToday);
    return map;
  }, [history, stepsToday, healthDaily]);

  // Pasos que hay en la base (los que sí dieron Puntos), para avisar cuando un día tiene más.
  const countedByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history ?? []) map.set(h.day, h.steps);
    return map;
  }, [history]);

  // Meta que tenía cada día: si después se cambia la meta, los días anteriores no se tocan.
  const goalByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history ?? []) if (h.goal) map.set(h.day, Math.max(h.goal, MIN_DAILY_GOAL));
    map.set(localKey(new Date()), goal);
    return map;
  }, [history, goal]);
  const goalFor = (key: string) => goalByDay.get(key) ?? goal;
  // Días en que la app abrió y sincronizó pasos: solo esos cuentan para la meta y los Puntos.
  const openedDays = useMemo(() => new Set((history ?? []).map((h) => h.day)), [history]);
  const firstDay = (history ?? []).reduce<string>((min, h) => (h.day < min ? h.day : min), localKey(new Date()));
  const todayKey = localKey(new Date());
  const [selected, setSelected] = useState<string | null>(null);

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

    const cells: ({ day: number; key: string; state: CalendarState } | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = localKey(new Date(year, month, day));
      // Verde: abrió la app y cumplió la meta de ese día. Rojo: abrió la app y no llegó. Gris: no abrió la app.
      // Sin color: hoy en curso, el futuro o antes de usar la app.
      const state = calendarDayState({
        key,
        todayKey,
        firstDay,
        opened: openedDays.has(key),
        steps: byDay.get(key) ?? 0,
        goal: goalByDay.get(key) ?? goal,
      });
      cells.push({ day, key, state });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [byDay, goal, goalByDay, firstDay, todayKey, openedDays]);

  const monthName = new Date().toLocaleDateString('es-BO', { month: 'long' });

  const fullHistory = useMemo(() => [...(history ?? [])].reverse(), [history]);

  return (
    <View className="flex-1">
      <HeaderLight />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-3" contentContainerStyle={{ paddingBottom: tabSpace }}>
      <ScreenTitle marginBottom={16}>Actividad</ScreenTitle>

      {wrapped && wrappedStart ? (
        <Press
          accessibilityRole="button"
          accessibilityLabel={`Ver tu ${wrappedMonthName(wrappedStart.getMonth())} en Camina`}
          onPress={() => setWrappedOpen(true)}
          className="mb-3"
        >
          <LinearGradient colors={['#3a2668', '#5B31A3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle size={22} color={colors.mintDark} weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-extrabold text-[15.5px]">Tu {wrappedMonthName(wrappedStart.getMonth())} en Camina</Text>
              <Text className="text-[12.5px]" style={{ color: '#D9CCF5' }}>Mirá tu resumen del mes y compartilo.</Text>
            </View>
            <ChevronRight size={16} color="#fff" />
          </LinearGradient>
        </Press>
      ) : null}

      <LinearGradient
        colors={[colors.authBgSoft, colors.authBg]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ borderRadius: 18, padding: 18, marginBottom: 12 }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-auth-muted text-xs mb-1">{range === 7 ? 'Esta semana' : 'Últimos 30 días'}</Text>
            <AnimatedNumber id={`actividad-total-${range}`} value={rangeTotal} ready={!isLoading} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} className="text-white" style={typo.display} />
            <View className="flex-row flex-wrap items-center mt-0.5" style={{ columnGap: 8 }}>
              <Text className="text-auth-muted text-xs">pasos · {Math.round(rangeTotal / range).toLocaleString('es-BO')} por día</Text>
              {range === 7 && weekTrendPct !== null ? (
                <View className="flex-row items-center" style={{ gap: 2 }}>
                  {weekTrendPct >= 0 ? <ChevronUp size={14} color={colors.authMuted} /> : <ChevronDown size={14} color={colors.authMuted} />}
                  <Text className="text-auth-muted text-xs">{Math.abs(weekTrendPct)}% vs. la anterior</Text>
                </View>
              ) : null}
            </View>
          </View>
          {/* Selector 7 / 30 días dentro de la tarjeta: cambia el único gráfico de la pantalla. */}
          <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {([7, 30] as const).map((r) => (
              <Press
                key={r}
                onPress={() => setRange(r)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityState={{ selected: range === r }}
                aria-pressed={range === r}
                hitSlop={{ top: 9, bottom: 9 }}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: range === r ? colors.mint : 'transparent' }}
              >
                <Text className="font-bold text-[12px]" style={{ color: range === r ? colors.mintDark : colors.authMuted }}>
                  {r} días
                </Text>
              </Press>
            ))}
          </View>
        </View>

        {isLoading ? (
          <SkeletonGroup style={{ height: CHART_H + 40, marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            {[0.5, 0.72, 0.9, 0.62, 0.8, 0.55, 0.3].map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <Skeleton onDark height={Math.max(8, h * CHART_H)} radius={11} style={{ marginBottom: 22 }} />
              </View>
            ))}
          </SkeletonGroup>
        ) : (
          <View style={{ height: CHART_H + 40, marginTop: 14 }}>
            <View className="flex-row items-end" style={{ gap: range === 7 ? 8 : 2, height: CHART_H + 40 }}>
              {chartDays.map((d, i) => {
                const hit = d.steps >= goalFor(d.key);
                return (
                  <Press
                    key={d.key}
                    onPress={() => setSelected(d.key)}
                    className="flex-1 items-center justify-end"
                    style={{ height: '100%' }}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.isToday ? 'Hoy' : dayLabel(d.key)}: ${d.steps.toLocaleString('es-BO')} pasos${hit ? ', meta cumplida' : ''}. Ver detalle`}
                  >
                    {d.isToday && range === 7 ? (
                      <Text className="text-[12px] font-bold text-white mb-1">{d.steps.toLocaleString('es-BO')}</Text>
                    ) : null}
                    <GrowIn id="actividad-barras" index={i} count={chartDays.length}>
                    {(() => {
                      const barStyle = {
                        width: '100%' as const,
                        height: Math.max(4, (d.steps / chartMax) * CHART_H),
                        borderTopLeftRadius: range === 7 ? 11 : 3,
                        borderTopRightRadius: range === 7 ? 11 : 3,
                        borderBottomLeftRadius: 3,
                        borderBottomRightRadius: 3,
                      };
                      // En 7 días las barras llevan degradé suave; en 30 días (30 barras finas) van de color liso.
                      if (range !== 7) {
                        return <View style={{ ...barStyle, backgroundColor: d.isToday ? colors.mint : hit ? colors.aqua : 'rgba(79,195,168,0.4)', ...(d.isToday ? { borderWidth: 1.5, borderColor: '#fff' } : {}) }} />;
                      }
                      const grad = d.isToday ? ['#A4F7DB', colors.mint] : hit ? ['#6FE0BF', '#3FAE95'] : ['rgba(79,195,168,0.5)', 'rgba(79,195,168,0.22)'];
                      return (
                        <LinearGradient
                          colors={grad as [string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={{ ...barStyle, ...(d.isToday ? { shadowColor: colors.mint, shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : {}) }}
                        />
                      );
                    })()}
                    </GrowIn>
                    <Text
                      className="text-[12px] mt-1.5"
                      style={{ height: 16, color: d.isToday ? '#fff' : colors.authMuted, fontWeight: d.isToday ? '800' : '500' }}
                    >
                      {range === 7 ? (d.isToday ? 'Hoy' : d.label) : ''}
                    </Text>
                  </Press>
                );
              })}
            </View>
            {/* Línea punteada de la meta diaria: va después de las barras para quedar por encima de ellas */}
            {goal <= chartMax && (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 20 + (goal / chartMax) * CHART_H, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)' }}>
                <View style={{ position: 'absolute', left: 0, top: -27, backgroundColor: '#2c1366', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text className="text-[12px] font-bold" style={{ color: colors.mint }}>meta {goal.toLocaleString('es-BO')}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      <Press
        accessibilityRole="button"
        accessibilityLabel="Compartir mi progreso como imagen"
        onPress={() => setShareOpen(true)}
        className="flex-row items-center justify-center rounded-2xl mb-3"
        style={{ gap: 9, paddingVertical: 14, backgroundColor: colors.aquaDeep }}
      >
        <Share2 size={18} color="#fff" weight="bold" />
        <Text className="text-white font-bold text-[14.5px]">Compartir mi progreso</Text>
      </Press>

      {/* Con la comunidad en 0 o sin diferencia no hay nada que comparar: no se muestra "supera por 0 pasos". */}
      {dailyDiffVsCommunity !== null && dailyDiffVsCommunity !== 0 && Number(communityAverage) > 0 && (
        <Glass className="flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3 mb-3">
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
        </Glass>
      )}

      <StreakCard streak={streak ?? 0} isDark={isDark} />

      <Text accessibilityRole="header" className="mt-4 mb-3 text-text-light dark:text-text-dark" style={typo.section}>Hoy</Text>
      <Glass className="rounded-3xl p-4 mb-3">
        <View className="flex-row mb-3">
          {([
            [stepsToday, 'pasos', (n: number) => n.toLocaleString('es-BO')],
            [km, 'km', (n: number) => n.toFixed(1).replace('.', ',')],
            [kcal, 'kcal', (n: number) => String(Math.round(n))],
          ] as const).map(([value, unit, fmt]) => (
            <View key={unit} className="flex-1">
              <AnimatedNumber id={`actividad-hoy-${unit}`} value={value} ready={!isLoading} format={fmt} className="text-text-light dark:text-text-dark" style={{ fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }} />
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

      <Glass className="rounded-3xl p-4 mb-7">
        <Text accessibilityRole="header" className="font-bold text-[13.5px] mb-3 text-text-light dark:text-text-dark">
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
                <Press
                  key={cell.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Día ${cell.day}: ${cell.state === 'met' ? 'meta cumplida' : cell.state === 'miss' ? 'meta no cumplida' : cell.state === 'idle' ? 'no abriste la app' : cell.key === todayKey ? 'hoy, en curso' : 'sin datos'}. Ver detalle`}
                  disabled={cell.key > todayKey}
                  hitSlop={{ top: 3, bottom: 3, left: 6, right: 6 }}
                  onPress={() => setSelected(cell.key)}
                  className="w-8 h-8 rounded-md items-center justify-center"
                  style={{
                    backgroundColor: CAL_BG[cell.state],
                    ...(cell.key === todayKey ? { borderWidth: 1.5, borderColor: colors.aquaDeep } : {}),
                  }}
                >
                  <Text className="text-[12px] font-bold" style={{ color: CAL_FG[cell.state] }}>
                    {cell.day}
                  </Text>
                </Press>
              ) : (
                <View key={`empty-${i}-${j}`} className="w-8 h-8" />
              )
            )}
          </View>
        ))}
        <View className="flex-row flex-wrap mt-2" style={{ gap: 12 }}>
          {([['met', 'Meta cumplida'], ['miss', 'No cumpliste'], ['idle', 'No abriste la app']] as const).map(([k, label]) => (
            <View key={k} className="flex-row items-center" style={{ gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CAL_BG[k] }} />
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">{label}</Text>
            </View>
          ))}
        </View>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-1.5">Tocá un día para ver su detalle. Cada día se mide con la meta que tenías ese día.</Text>
      </Glass>

      <Text accessibilityRole="header" className="mb-3 text-text-light dark:text-text-dark" style={typo.section}>Toda tu actividad</Text>
      <View className="gap-2.5">
        {fullHistory.map((h) => {
          const met = h.steps >= (h.goal ? Math.max(h.goal, MIN_DAILY_GOAL) : goal);
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
                style={{ color: met ? accentText : warnText }}
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
      <ResumenShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        byDay={byDay}
        goalFor={goalFor}
        openedDays={openedDays}
        streak={streak ?? 0}
        weeklyRank={myRank?.position ?? null}
        firstName={firstName}
      />
      <WrappedViewer visible={wrappedOpen} onClose={() => setWrappedOpen(false)} data={wrapped} firstName={firstName} />
      <Modal visible={selected != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: 'rgba(20,12,36,0.55)' }}>
          {/* El fondo que cierra el detalle es hermano de la tarjeta (no su padre): así el lector de pantalla llega al contenido y al botón Cerrar. */}
          <Press accessibilityRole="button" accessibilityLabel="Cerrar detalle" onPress={() => setSelected(null)} style={StyleSheet.absoluteFill} />
          {selected != null && (() => {
            const steps = byDay.get(selected) ?? 0;
            const g = goalFor(selected);
            const opened = selected === todayKey || openedDays.has(selected);
            const met = opened && steps >= g;
            const dayKm = (steps * STEP_LENGTH_METERS) / 1000;
            return (
              <View className="w-full rounded-3xl p-5 bg-card-light dark:bg-card-dark" style={{ maxWidth: 360 }}>
                <Text accessibilityRole="header" className="text-[16px] font-extrabold text-text-light dark:text-text-dark">{selected === todayKey ? 'Hoy' : dayLabel(selected)}</Text>
                <Text className="text-[30px] font-extrabold mt-2 text-text-light dark:text-text-dark">{steps.toLocaleString('es-BO')}</Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mb-3">pasos · {dayKm.toFixed(1).replace('.', ',')} km · {Math.round(steps * KCAL_PER_STEP)} kcal</Text>
                {opened && (
                  <View className="h-2 rounded-full bg-line-light dark:bg-line-dark overflow-hidden mb-2">
                    <View className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((steps / g) * 100))}%`, backgroundColor: met ? (isDark ? colors.mint : colors.aquaDeep) : colors.warn }} />
                  </View>
                )}
                <Text
                  className={`text-[13px] font-semibold ${opened ? '' : 'text-text-light dark:text-text-dark'}`}
                  style={opened ? { color: met ? accentText : warnText } : undefined}
                >
                  {!opened ? 'No abriste la app ese día' : met ? 'Meta cumplida' : 'No cumpliste la meta'}
                </Text>
                <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">Meta de ese día: {g.toLocaleString('es-BO')} pasos</Text>
                {!opened && (
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-2">
                    Para que los pasos cuenten y sumen Puntos, tenés que abrir la app ese día.
                  </Text>
                )}
                {opened && selected !== todayKey && steps - (countedByDay.get(selected) ?? 0) > 0 && (
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-2">
                    {(steps - (countedByDay.get(selected) ?? 0)).toLocaleString('es-BO')} de estos pasos no sumaron Puntos: los Puntos solo se cargan cuando abrís la app ese día.
                  </Text>
                )}
                <Press accessibilityRole="button" onPress={() => setSelected(null)} className="mt-4 rounded-xl py-3 items-center bg-purple-light-light dark:bg-purple-light-dark">
                  <Text className="font-semibold text-[13.5px]" style={{ color: purpleText }}>Cerrar</Text>
                </Press>
              </View>
            );
          })()}
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

