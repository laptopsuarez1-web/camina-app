import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { MIN_DAILY_GOAL } from '@/constants/business-rules';
import { computeShareStats, dayKey, longestRun, monthName, splitMonthPoints } from '@/lib/share-stats';
import type { WrappedData } from '@/components/share/cards';

// Los primeros días del mes se ofrece el Wrapped del mes que terminó.
export const WRAPPED_DAYS = 7;

// Primer día del mes que se puede ver como Wrapped (el mes pasado, durante los primeros WRAPPED_DAYS días del mes), o null.
export function wrappedMonthStart(now: Date = new Date()): Date | null {
  if (now.getDate() > WRAPPED_DAYS) return null;
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function lastDay(first: Date) {
  return new Date(first.getFullYear(), first.getMonth() + 1, 0);
}

function addDays(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

// Todo sale de los datos propios de la persona (steps_daily y points_ledger) más su mejor puesto semanal del ranking global
// (función my_best_weekly_rank, migración 0059). Si esa función todavía no está en la base o la persona no aparece en el ranking,
// el Wrapped sigue sin la lámina del puesto.
export function useWrapped(first: Date | null) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const goal = useAuthStore((s) => Math.max(s.profile?.daily_goal ?? 6000, MIN_DAILY_GOAL));
  const monthKey = first ? dayKey(first) : null;

  return useQuery({
    queryKey: ['wrapped', userId, monthKey, goal],
    enabled: !!userId && !!first,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WrappedData | null> => {
      const start = first!;
      const end = lastDay(start);
      const startKey = dayKey(start);
      const nextKey = dayKey(new Date(start.getFullYear(), start.getMonth() + 1, 1));
      const prevKey = dayKey(new Date(start.getFullYear(), start.getMonth() - 1, 1));

      const [stepsRes, ledgerRes, rankRes] = await Promise.all([
        supabase.from('steps_daily').select('day, steps, goal').eq('user_id', userId!).gte('day', prevKey).lt('day', nextKey),
        supabase.from('points_ledger').select('amount, reason').eq('user_id', userId!).gte('earned_at', start.toISOString()).lt('earned_at', new Date(start.getFullYear(), start.getMonth() + 1, 1).toISOString()),
        supabase.rpc('my_best_weekly_rank', { p_month: startKey }),
      ]);
      if (stepsRes.error) throw stepsRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const rows = stepsRes.data ?? [];
      const byDay = new Map(rows.map((r) => [r.day, r.steps]));
      const goalByDay = new Map(rows.filter((r) => r.goal).map((r) => [r.day, Math.max(r.goal as number, MIN_DAILY_GOAL)]));
      const stats = computeShareStats({
        period: 'month',
        today: end,
        byDay,
        goalFor: (k) => goalByDay.get(k) ?? goal,
        openedDays: new Set(rows.map((r) => r.day)),
      });
      if (stats.steps <= 0) return null;

      const rankRow = rankRes.error ? null : ((rankRes.data as { week_start: string; rank_position: number | string; participants: number | string }[] | null)?.[0] ?? null);
      return {
        monthName: monthName(start.getMonth()),
        name: null,
        steps: stats.steps,
        trendPct: stats.trendPct,
        avgPerDay: stats.avgPerDay,
        km: stats.km,
        kcal: stats.kcal,
        days: stats.days,
        daysMet: stats.daysMet,
        best: stats.best,
        calendar: stats.bars.map((b, i) => ({ key: b.key, day: i + 1, met: b.met })),
        firstWeekday: (start.getDay() + 6) % 7,
        run: longestRun(stats.bars),
        rank: rankRow
          ? { weekStart: rankRow.week_start, weekEnd: addDays(rankRow.week_start, 6), position: Number(rankRow.rank_position), participants: Number(rankRow.participants) }
          : null,
        points: splitMonthPoints(ledgerRes.data ?? []),
      };
    },
  });
}
