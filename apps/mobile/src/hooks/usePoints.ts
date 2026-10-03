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

// Medianoche local del dispositivo como instante exacto (con zona), para filtrar "hoy" bien en la base.
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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

// Puntos ganados hoy, de cualquier origen (pasos, referidos, retos) — no solo
// los de pasos que ya se ven en el aro de Inicio.
export function usePointsToday() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['points-today', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('amount, earned_at')
        .eq('user_id', userId!)
        .gte('earned_at', startOfTodayISO());
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
    },
  });
}

// El lote de Puntos que vence más pronto — para el aviso "N puntos vencen en
// M días" (mismo criterio de vigencia que POINTS_TTL_DAYS, ver 0001_init.sql).
export function usePointsExpiringSoon(withinDays = 30) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['points-expiring-soon', userId, withinDays],
    enabled: !!userId,
    queryFn: async () => {
      // El servidor ya descuenta lo que gastaste: solo cuenta puntos que de verdad se van a perder.
      const { data, error } = await supabase.rpc('points_expiring_soon', { p_within_days: withinDays });
      if (error) throw error;
      const row = (data as { amount: number; days: number }[] | null)?.[0];
      if (!row || !row.amount) return null;
      return { amount: row.amount, days: row.days };
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
