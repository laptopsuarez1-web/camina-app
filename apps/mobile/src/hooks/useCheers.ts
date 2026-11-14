import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buzz } from '@/lib/haptics';

// Aplausos del grupo (migración 0121): como los «kudos» de Strava. Cada integrante aplaude a otro una vez por día.
// Si el servidor todavía no tiene la migración, la consulta falla y los aplausos no se muestran (nada se rompe).
export type CheerMap = Record<string, { cheers: number; mine: boolean }>;

export function useGroupCheers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-cheers', groupId],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: async (): Promise<CheerMap | null> => {
      const { data, error } = await supabase.rpc('group_cheers_today', { p_group: groupId! });
      if (error) return null;
      const out: CheerMap = {};
      for (const r of (data ?? []) as { to_user: string; cheers: number; mine: boolean }[]) out[r.to_user] = { cheers: r.cheers, mine: r.mine };
      return out;
    },
  });
}

export function useCheer(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (to: string) => {
      const { error } = await supabase.rpc('cheer_member', { p_group: groupId!, p_to: to });
      if (error) throw error;
    },
    // Se marca al instante (como el corazón de Instagram); si falla, se vuelve atrás.
    onMutate: async (to) => {
      buzz.light();
      const key = ['group-cheers', groupId];
      const prev = qc.getQueryData<CheerMap | null>(key);
      if (prev) qc.setQueryData<CheerMap>(key, { ...prev, [to]: { cheers: (prev[to]?.cheers ?? 0) + 1, mine: true } });
      return { prev };
    },
    onError: (_e, _to, ctx) => qc.setQueryData(['group-cheers', groupId], ctx?.prev ?? null),
    onSettled: () => qc.invalidateQueries({ queryKey: ['group-cheers', groupId] }),
  });
}
