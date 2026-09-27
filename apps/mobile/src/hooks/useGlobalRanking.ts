import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Ranking real entre TODOS los usuarios de Camina (no solo tu grupo) — usa
// las funciones security definer de supabase/migrations/0006_terms_global_ranking.sql
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
