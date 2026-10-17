import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { LoyaltyCard } from '@/lib/database.types';

// Tarjeta de fidelidad de un local (aunque esté en cero). Si el local no tiene tarjeta
// (plan gratis, sin premio elegido) o la función todavía no existe, devuelve null y no se muestra nada.
export function useLoyaltyCard(businessId: string | null | undefined) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['loyalty-card', userId, businessId],
    enabled: !!userId && !!businessId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_loyalty_cards', { p_business_id: businessId! });
      if (error || !data) return null;
      return (data as LoyaltyCard[])[0] ?? null;
    },
  });
}

// "Mis tarjetas": los locales donde ya sumó al menos un sello.
export function useLoyaltyCards() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['loyalty-cards', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_loyalty_cards');
      if (error) throw error;
      return (data ?? []) as LoyaltyCard[];
    },
  });
}
