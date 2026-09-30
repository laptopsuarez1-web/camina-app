import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Benefit, Business, Redemption } from '@/lib/database.types';

export type BenefitWithBusiness = Benefit & { business: Business };

// Solo se muestran los comercios de la ciudad de la persona (por defecto Tarija).
export function useBenefits() {
  const city = useAuthStore((s) => s.profile?.city ?? 'Tarija');
  return useQuery({
    queryKey: ['benefits', city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('benefits')
        .select('*, business:businesses(*)')
        .eq('active', true);
      if (error) throw error;
      return (data as unknown as BenefitWithBusiness[]).filter((b) => (b.business?.city ?? 'Tarija') === city);
    },
  });
}

// Cupones ya usados hoy por beneficio — para mostrar "Quedan X hoy" sin
// exponerle a cada usuario el historial de canjes de los demás.
export function useBenefitsRemainingToday() {
  return useQuery({
    queryKey: ['benefits-remaining-today'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('benefits_remaining_today');
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) map.set(row.benefit_id, row.redeemed_today);
      return map;
    },
    staleTime: 60_000,
  });
}

export function useRedeemBenefit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (benefitId: string) => {
      const { data, error } = await supabase.rpc('redeem_benefit', { p_benefit_id: benefitId });
      if (error) throw error;
      return data as unknown as Redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-remaining-today'] });
    },
  });
}

export function useRegenerateCode() {
  return useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase.rpc('regenerate_redemption_code', {
        p_redemption_id: redemptionId,
      });
      if (error) throw error;
      return data as unknown as Redemption;
    },
  });
}

// Cuando el código de 15 minutos vence sin que el comercio lo confirme, esto
// cancela el canje y devuelve los Puntos (ver cancel_expired_redemption en
// supabase/migrations/0003_fixes.sql) — antes se perdían para siempre.
export function useCancelExpiredRedemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase.rpc('cancel_expired_redemption', {
        p_redemption_id: redemptionId,
      });
      if (error) throw error;
      return data as unknown as Redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
    },
  });
}

export function useMyRedemptions() {
  return useQuery({
    queryKey: ['redemptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, benefit:benefits(*), business:businesses(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
