import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// OJO: nunca uses Date.toISOString() acá — eso da la fecha en UTC, no la del
// dispositivo. Para un usuario en Bolivia (UTC-4), toISOString() ya muestra
// "mañana" desde las 20:00 hora local, lo que desalinea el día contra el
// servidor (que ahora fija America/La_Paz — ver supabase/migrations/0003_fixes.sql).
// Se arma la fecha con los getters locales del dispositivo en su lugar.
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
