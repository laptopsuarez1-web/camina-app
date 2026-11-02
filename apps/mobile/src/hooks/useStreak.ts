import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { MIN_DAILY_GOAL, DEFAULT_DAILY_GOAL, STREAK_MIN_STEPS } from '@/constants/business-rules';
import { localDay } from '@/lib/format';
import { boliviaToday } from '@/lib/bolivia';

export interface Streaks {
  /** Racha: días seguidos con al menos STREAK_MIN_STEPS pasos (5.000). Es la que da el bono semanal. */
  racha: number;
  /** Meta personal: días seguidos llegando a la meta que tenía la persona ese día. No cambia la Racha. */
  meta: number;
}

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Días consecutivos que terminan hoy (o ayer, para no cortar mientras hoy sigue en curso) dentro del conjunto.
function run(days: Set<string>): number {
  const cursor = new Date();
  let n = 0;
  if (!days.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

// Las dos rachas, calculadas desde steps_daily (un día sin fila = no abrió la app = corta).
export function useStreaks() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const goal = useAuthStore((s) => Math.max(s.profile?.daily_goal ?? DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL));

  return useQuery({
    queryKey: ['streak', userId, goal],
    enabled: !!userId,
    queryFn: async (): Promise<Streaks> => {
      const since = boliviaToday();
      since.setDate(since.getDate() - 400);
      const { data, error } = await supabase
        .from('steps_daily')
        .select('day, steps, goal')
        .eq('user_id', userId!)
        .gte('day', localDay(since))
        .order('day', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const racha = new Set(rows.filter((d) => d.steps >= STREAK_MIN_STEPS).map((d) => d.day));
      const meta = new Set(rows.filter((d) => d.steps >= (d.goal ? Math.max(d.goal, MIN_DAILY_GOAL) : goal)).map((d) => d.day));
      return { racha: run(racha), meta: run(meta) };
    },
  });
}
