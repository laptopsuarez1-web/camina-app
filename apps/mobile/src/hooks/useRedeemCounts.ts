import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Canjes confirmados por comercio. La base solo devuelve los que llegan a 100;
// si la función todavía no existe, no se muestra nada.
export function useRedeemCounts() {
  return useQuery({
    queryKey: ['business-redeem-counts'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('business_redeem_counts');
      if (error || !data) return {} as Record<string, number>;
      return Object.fromEntries((data as { business_id: string; total: number }[]).map((r) => [r.business_id, Number(r.total)]));
    },
  });
}
