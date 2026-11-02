import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Benefit, Business, LocalCodeResult, Redemption, StoryShare } from '@/lib/database.types';

export type BenefitWithBusiness = Benefit & { business: Business };

// Solo se muestran los comercios de la ciudad de la persona (por defecto Tarija).
export function useBenefits() {
  const city = useAuthStore((s) => s.profile?.city ?? 'Tarija');
  return useQuery({
    queryKey: ['benefits', city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('benefits')
        // Hay dos relaciones entre benefits y businesses (benefits.business_id y businesses.loyalty_benefit_id):
        // sin indicar cuál, PostgREST responde 300 (ambiguo) y Canjes no carga.
        .select('*, business:businesses!benefits_business_id_fkey(*)')
        .eq('active', true);
      if (error) throw error;
      return (data as unknown as BenefitWithBusiness[]).filter((b) => (b.business?.city ?? 'Tarija') === city);
    },
  });
}

// Comercios aprobados de la ciudad (la base solo muestra los aprobados). Canjes los usa para que un local
// aparezca en la lista y en el mapa aunque todavía no tenga ningún beneficio activo.
export function useApprovedBusinesses() {
  const city = useAuthStore((s) => s.profile?.city ?? 'Tarija');
  return useQuery({
    queryKey: ['approved-businesses', city],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('*').eq('approved', true);
      if (error) throw error;
      return (data as unknown as Business[]).filter((b) => (b.city ?? 'Tarija') === city);
    },
    staleTime: 60_000,
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

// Cupos de los premios online: canjes ya usados y, si la tienda carga sus propios cupones (canal web), cuántos le quedan.
export type OnlineCupos = { redeemed: number; codesLeft: number | null };
export function useOnlineRedeemed() {
  return useQuery({
    queryKey: ['benefits-online-redeemed'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('benefits_online_redeemed');
      if (error) throw error;
      const map = new Map<string, OnlineCupos>();
      for (const row of data ?? []) map.set(row.benefit_id, { redeemed: row.redeemed, codesLeft: row.codes_left ?? null });
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
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['points-expiring-soon'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-remaining-today'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-online-redeemed'] });
      queryClient.invalidateQueries({ queryKey: ['camina-card'] });
    },
  });
}

// Canje con el código de 4 números del local: si todo está bien, queda confirmado en el acto.
export function useRedeemWithLocalCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { benefitId: string; code: string; lat: number | null; lng: number | null }) => {
      const { data, error } = await supabase.rpc('redeem_with_local_code', {
        p_benefit_id: args.benefitId,
        p_code: args.code,
        p_lat: args.lat,
        p_lng: args.lng,
      });
      if (error) throw error;
      return data as unknown as LocalCodeResult;
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const key of ['points-balance', 'points-ledger', 'points-expiring-soon', 'redemptions', 'benefits-remaining-today', 'new-place-bonus', 'camina-card']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
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
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['points-expiring-soon'] });
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

// Historias de Instagram que la persona ya mandó, por canje (para el botón de "Tus canjes").
export function useMyStoryShares() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['story-shares', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('story_shares').select('id, redemption_id, status').eq('user_id', userId!);
      if (error) throw error;
      const byRedemption: Record<string, Pick<StoryShare, 'id' | 'status'>> = {};
      for (const s of data ?? []) byRedemption[s.redemption_id] = { id: s.id, status: s.status };
      return byRedemption;
    },
  });
}
