import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

function startOfWeekLocal() {
  const d = new Date();
  const day = d.getDay(); // 0=domingo
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Reto real (no decorativo): cuántos días de esta semana ya cumpliste tu
// meta diaria, calculado desde steps_daily — no hay tabla de "retos" todavía,
// así que por ahora es el único que se puede mostrar sin inventar datos.
export function useWeeklyGoalReto() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const goal = useAuthStore((s) => s.profile?.daily_goal ?? 6000);
  const TARGET_DAYS = 5;

  return useQuery({
    queryKey: ['weekly-goal-reto', userId, goal],
    enabled: !!userId,
    queryFn: async () => {
      const monday = startOfWeekLocal();
      const { data, error } = await supabase
        .from('steps_daily')
        .select('steps')
        .eq('user_id', userId!)
        .gte('day', monday.toISOString().slice(0, 10));
      if (error) throw error;
      const met = (data ?? []).filter((d) => d.steps >= goal).length;
      return { met: Math.min(met, TARGET_DAYS), target: TARGET_DAYS, pct: Math.min(100, Math.round((met / TARGET_DAYS) * 100)) };
    },
  });
}
