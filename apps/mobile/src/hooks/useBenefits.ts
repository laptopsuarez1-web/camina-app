import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Benefit, Business, Redemption } from '@/lib/database.types';

export type BenefitWithBusiness = Benefit & { business: Business };

export function useBenefits() {
  return useQuery({
    queryKey: ['benefits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('benefits')
        .select('*, business:businesses(*)')
        .eq('active', true);
      if (error) throw error;
      return data as unknown as BenefitWithBusiness[];
    },
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
