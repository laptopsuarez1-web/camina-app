import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Ranking real entre TODOS los usuarios de Camina (no solo tu grupo) — usa
// las funciones security definer de supabase/migrations/0006_terms_global_ranking.sql (y 0056: abierto siempre)
// porque steps_daily es select-own y el cliente no puede agregar pasos ajenos
// directo. Solo entran quienes activaron "Aparecer en el ranking" en Perfil.
export function useGlobalRanking() {
  return useQuery({
    queryKey: ['global-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('global_weekly_ranking', { p_limit: 20 });
      if (error) throw error;
      return data;
    },
  });
}

export function useCommunityAverage() {
  return useQuery({
    queryKey: ['community-average'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_weekly_average');
      if (error) throw error;
      return data ?? 0;
    },
  });
}

// Mi puesto en el ranking global de la semana. null si no aparezco (ranking apagado o sin pasos).
export function useMyWeeklyRank() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['my-weekly-rank', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_weekly_rank');
      if (error) throw error;
      const row = (data as { rank_position: number | string; total_steps: number | string }[] | null)?.[0];
      return row ? { position: Number(row.rank_position), steps: Number(row.total_steps) } : null;
    },
  });
}
