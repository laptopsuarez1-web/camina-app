import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Puntos extra que ofrece este local por la primera vez de la persona (0 si no aplica: plan gratis o ya canjeó aquí).
export function useNewPlaceBonus(businessId: string | null | undefined) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['new-place-bonus', userId, businessId],
    enabled: !!userId && !!businessId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_new_place_bonus', { p_business_id: businessId! });
      if (error) return 0;
      return Number(data ?? 0);
    },
  });
}
