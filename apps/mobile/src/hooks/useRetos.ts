import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type RetoKind = 'referrals' | 'steps_streak' | 'weekly_goals';

export interface Reto {
  id: string;
  title: string;
  description: string;
  kind: RetoKind;
  target: number;
  reward_points: number;
  met: number;
  pct: number;
  claimable: boolean;
  claimed: boolean;
}

// Los retos los define el equipo de Camina (tabla retos) y el avance lo calcula el servidor
// (reto_progress), así lo que ves es lo mismo que se paga al reclamar.
export function useRetos() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['retos', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Reto[]> => {
      const [{ data: retos, error }, { data: progress, error: pError }] = await Promise.all([
        supabase.from('retos').select('id, title, description, kind, target, reward_points').eq('active', true).order('sort'),
        supabase.rpc('reto_progress'),
      ]);
      if (error) throw error;
      if (pError) throw pError;
      const rows = (progress ?? []) as { reto_id: string; met: number; claimable: boolean; claimed_now: boolean }[];
      const byId = new Map(rows.map((p) => [p.reto_id, p]));
      return (retos ?? []).map((r) => {
        const p = byId.get(r.id);
        const met = p?.met ?? 0;
        return {
          ...r,
          kind: r.kind as RetoKind,
          met,
          pct: Math.min(100, Math.round((met / r.target) * 100)),
          claimable: p?.claimable ?? false,
          claimed: !!p?.claimed_now,
        };
      });
    },
  });
}

// La tarjeta de "metas de esta semana" de Inicio usa el primer reto semanal activo.
export function useWeeklyGoalReto() {
  const query = useRetos();
  return { ...query, data: query.data?.find((r) => r.kind === 'weekly_goals') };
}

export function useClaimReto() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (retoId: string) => {
      const { data, error } = await supabase.rpc('claim_reto', { p_reto_id: retoId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retos', userId] });
      queryClient.invalidateQueries({ queryKey: ['points-balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['points-ledger', userId] });
      queryClient.invalidateQueries({ queryKey: ['points-today', userId] });
    },
  });
}
