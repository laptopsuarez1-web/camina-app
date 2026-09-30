import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface PromotionItem {
  id: string;
  kind: 'evento' | 'sorteo';
  title: string;
  description: string;
  prize: string | null;
  winners_count: number;
  starts_at: string;
  ends_at: string;
  req_steps: number | null;
  req_days: number | null;
  business: { name: string; logo_url: string | null; category: string } | null;
  joined: boolean;
  won: boolean;
}

// Eventos y sorteos vigentes de los comercios (los aprueba el equipo de Camina).
export function usePromotions() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['promotions', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PromotionItem[]> => {
      const nowISO = new Date().toISOString();
      const [{ data, error }, { data: entries }, { data: wins }] = await Promise.all([
        supabase
          .from('promotions')
          .select('id, kind, title, description, prize, winners_count, starts_at, ends_at, req_steps, req_days, status, business:businesses(name, logo_url, category)')
          .in('status', ['approved', 'finished'])
          .gte('ends_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
          .order('ends_at'),
        supabase.from('promotion_entries').select('promotion_id').eq('user_id', userId!),
        supabase.from('promotion_winners').select('promotion_id').eq('user_id', userId!),
      ]);
      if (error) return [];
      const joined = new Set((entries ?? []).map((e: { promotion_id: string }) => e.promotion_id));
      const won = new Set((wins ?? []).map((e: { promotion_id: string }) => e.promotion_id));
      return ((data ?? []) as unknown as (PromotionItem & { status: string })[])
        .filter((p) => p.status === 'approved' ? p.starts_at <= nowISO && p.ends_at >= nowISO : won.has(p.id))
        .map((p) => ({ ...p, joined: joined.has(p.id), won: won.has(p.id) }));
    },
  });
}

export function useJoinPromotion() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('join_promotion', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions', userId] }),
  });
}
