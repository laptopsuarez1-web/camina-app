import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { MIN_DAILY_GOAL } from '@/constants/business-rules';

// Racha real calculada desde steps_daily: días consecutivos (terminando hoy
// o ayer, para no cortar la racha mientras el día de hoy todavía está en
// curso) donde los pasos llegaron a la meta que tenía ese día (cambiar la meta no toca los días anteriores).
export function useStreak() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const goal = useAuthStore((s) => Math.max(s.profile?.daily_goal ?? 6000, MIN_DAILY_GOAL));

  return useQuery({
    queryKey: ['streak', userId, goal],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data, error } = await supabase
        .from('steps_daily')
        .select('day, steps, goal')
        .eq('user_id', userId!)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: false });
      if (error) throw error;

      const metDays = new Set((data ?? []).filter((d) => d.steps >= (d.goal ? Math.max(d.goal, MIN_DAILY_GOAL) : goal)).map((d) => d.day));
      const localKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const cursor = new Date();
      let streak = 0;
      // si hoy todavía no llegó a la meta, arranca a contar desde ayer
      if (!metDays.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      for (;;) {
        if (!metDays.has(localKey(cursor))) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },
  });
}
