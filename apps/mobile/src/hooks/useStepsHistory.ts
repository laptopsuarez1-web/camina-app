import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { boliviaToday } from '@/lib/bolivia';
import { localDay } from '@/lib/format';

// Pasos de los últimos 36 días (los usa Actividad). Vive aquí para que también se pueda precargar al abrir la app.
export function useStepsHistory() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['steps-history-full', userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = boliviaToday();
      // 30 días del gráfico más 6 antes, para que el promedio de 7 días del primer día también esté completo.
      since.setDate(since.getDate() - 36);
      const { data, error } = await supabase
        .from('steps_daily')
        .select('day, steps, goal')
        .eq('user_id', userId!)
        .gte('day', localDay(since))
        .order('day', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
