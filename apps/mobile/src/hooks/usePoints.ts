import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function usePointsBalance() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['points-balance', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('user_points_balance', { p_user_id: userId! });
      if (error) throw error;
      return data as number;
    },
    staleTime: 15_000,
  });
}

// Sincroniza los pasos leídos del podómetro contra el servidor, que acredita
// Puntos (con el tope diario) de forma idempotente.
export function useSyncSteps() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (steps: number) => {
      if (!userId) throw new Error('Sin sesión');
      const { data, error } = await supabase.rpc('earn_points_from_steps', {
        p_user_id: userId,
        p_day: todayISO(),
        p_steps: steps,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-balance', userId] });
    },
  });
}

export function usePointsLedger() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['points-ledger', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', userId!)
        .order('earned_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}
