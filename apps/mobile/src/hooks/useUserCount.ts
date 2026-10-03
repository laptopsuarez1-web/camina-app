import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RANKING_MIN_USERS } from '@/constants/business-rules';

// Cuántas personas usan Camina (solo el número). Si no se puede consultar, se asume que son pocas.
export function useUserCount() {
  return useQuery({
    queryKey: ['app-user-count'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('app_user_count');
      if (error) return 0;
      return Number(data ?? 0);
    },
  });
}

// El ranking global se muestra recién cuando hay más de 1.000 usuarios.
export function useGlobalRankingOpen() {
  const { data } = useUserCount();
  return (data ?? 0) > RANKING_MIN_USERS;
}
