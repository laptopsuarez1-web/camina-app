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

// Racha de días con 10.000+ pasos, mismo criterio que useStreak pero con
// umbral fijo (no la meta personal) — es el reto "10.000 pasos x 14 días".
export function useTenKStreakReto() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const TARGET_DAYS = 14;
  const THRESHOLD = 10000;

  return useQuery({
    queryKey: ['tenk-streak-reto', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - (TARGET_DAYS + 5));
      const { data, error } = await supabase
        .from('steps_daily')
        .select('day, steps')
        .eq('user_id', userId!)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: false });
      if (error) throw error;

      const metDays = new Set((data ?? []).filter((d) => d.steps >= THRESHOLD).map((d) => d.day));
      const localKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const cursor = new Date();
      if (!metDays.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      for (; streak < TARGET_DAYS; ) {
        if (!metDays.has(localKey(cursor))) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return { met: streak, target: TARGET_DAYS, pct: Math.min(100, Math.round((streak / TARGET_DAYS) * 100)) };
    },
  });
}

// "Invitá 5 amigos" — cuenta real de filas en referrals donde el usuario es
// el que invitó, sin importar si ya se acreditó el punto (el reto es por
// gente sumada, no por puntos ganados).
export function useReferralReto() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const TARGET = 5;

  return useQuery({
    queryKey: ['referral-reto', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_user_id', userId!);
      if (error) throw error;
      const met = count ?? 0;
      return { met: Math.min(met, TARGET), target: TARGET, pct: Math.min(100, Math.round((met / TARGET) * 100)) };
    },
  });
}
