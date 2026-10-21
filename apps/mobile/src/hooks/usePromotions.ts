import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface PromotionItem {
  id: string;
  kind: 'evento' | 'sorteo' | 'desafio' | 'publicidad';
  title: string;
  description: string;
  prize: string | null;
  winners_count: number;
  starts_at: string;
  ends_at: string;
  req_steps: number | null;
  req_days: number | null;
  goal_mode: 'daily' | 'total' | null;
  goal_steps: number | null;
  goal_days: number | null;
  bg_color: string | null;
  bg_image_url: string | null;
  bg_logo: boolean;
  cta_url: string | null;
  photos: string[];
  place_name: string | null;
  place_address: string | null;
  place_url: string | null;
  ticket_price: string | null;
  ticket_url: string | null;
  participants: number;
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
      const [{ data, error }, { data: entries }, { data: wins }, { data: counts }] = await Promise.all([
        supabase
          .from('promotions')
          .select('id, kind, title, description, prize, winners_count, starts_at, ends_at, req_steps, req_days, goal_mode, goal_steps, goal_days, bg_color, bg_image_url, bg_logo, cta_url, photos, place_name, place_address, place_url, ticket_price, ticket_url, status, business:businesses(name, logo_url, category)')
          .in('status', ['approved', 'finished'])
          .gte('ends_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
          .order('ends_at'),
        supabase.from('promotion_entries').select('promotion_id').eq('user_id', userId!),
        supabase.from('promotion_winners').select('promotion_id').eq('user_id', userId!),
        supabase.rpc('promotion_counts'),
      ]);
      // La consulta principal propaga el error (así la pantalla puede ofrecer "Reintentar");
      // las de entries y wins siguen tolerantes: si fallan, solo falta el "anotado" y el "ganaste".
      if (error) throw error;
      const joined = new Set((entries ?? []).map((e: { promotion_id: string }) => e.promotion_id));
      const won = new Set((wins ?? []).map((e: { promotion_id: string }) => e.promotion_id));
      const people = new Map<string, number>((counts ?? []).map((c: { promotion_id: string; participants: number }) => [c.promotion_id, c.participants] as [string, number]));
      return ((data ?? []) as unknown as (Omit<PromotionItem, 'participants'> & { status: string })[])
        .filter((p) => p.status === 'approved' ? p.ends_at >= nowISO && (p.kind === 'evento' || p.starts_at <= nowISO) : won.has(p.id))
        .map((p) => ({ ...p, participants: people.get(p.id) ?? 0, joined: joined.has(p.id), won: won.has(p.id) }));
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', userId] });
      queryClient.invalidateQueries({ queryKey: ['promotion-progress'] });
    },
  });
}

// Mi avance en un desafío: pasos y días cumplidos desde que me anoté.
export function usePromotionProgress(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['promotion-progress', id],
    enabled: enabled && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_promotion_progress', { p_id: id! });
      if (error) throw error;
      const row = (data as { steps_total: number; days_met: number }[] | null)?.[0];
      return { steps: row?.steps_total ?? 0, days: row?.days_met ?? 0 };
    },
  });
}
