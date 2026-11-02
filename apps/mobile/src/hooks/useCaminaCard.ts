import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { CaminaCard } from '@/lib/database.types';

export const CAMINA_CARD_DAYS = 30;

// La tarjeta general de Camina de la persona. Si la función todavía no existe devuelve null y no se muestra nada.
export function useCaminaCard() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['camina-card', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_camina_card');
      if (error || !data) return null;
      return data as CaminaCard;
    },
  });
}

// Elegir (o cambiar, mientras no se haya canjeado) el premio de la tarjeta completa.
export function useChooseCaminaPrize() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (benefitId: string) => {
      const { data, error } = await supabase.rpc('choose_camina_prize', { p_benefit_id: benefitId });
      if (error) throw error;
      return data as CaminaCard;
    },
    onSuccess: (card) => queryClient.setQueryData(['camina-card', userId], card),
  });
}

// Días que le quedan al premio (0 si ya venció); null si la tarjeta no está completa.
export function daysLeft(card: Pick<CaminaCard, 'expires_at'>, now = Date.now()) {
  if (!card.expires_at) return null;
  return Math.max(0, Math.ceil((new Date(card.expires_at).getTime() - now) / 86_400_000));
}
