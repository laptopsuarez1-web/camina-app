import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { boliviaDay } from '@/lib/bolivia';
import { recordStatus } from '@/lib/personal-record';

// Pasos de los días anteriores (hasta un año) para saber si hoy es récord personal.
export function usePersonalRecord(todaySteps: number) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const q = useQuery({
    queryKey: ['steps-history-year', userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const since = boliviaDay(new Date(Date.now() - 365 * 86_400_000));
      const { data, error } = await supabase.from('steps_daily').select('day, steps').eq('user_id', userId!).gte('day', since).limit(400);
      if (error) return [];
      return (data ?? []) as { day: string; steps: number }[];
    },
  });
  if (!q.data) return { isRecord: false, prevBest: 0, prevBestDay: null };
  return recordStatus(todaySteps, q.data, boliviaDay(new Date()));
}
