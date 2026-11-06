import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Ruta del mes (migración 0082). Todo lo decide el servidor: qué locales tocan, cuándo cuenta una visita y el Día doble.
export type RutaStop = {
  business_id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  visit: 'pending' | 'confirmed' | null;
};

export type RutaState = {
  month: string; // primer día del mes, YYYY-MM-DD
  ends_on: string;
  joined: boolean;
  swaps_left: number;
  swaps_total?: number;
  completed_at: string | null;
  ticket_no: number | null;
  prev_completed: boolean;
  double_day: string | null;
  eligible_count: number;
  locales: { name: string; logo_url: string | null; lat: number | null; lng: number | null }[];
  stops: RutaStop[];
};

export type RutaOption = { business_id: string; name: string; category: string | null; logo_url: string | null };

const key = (userId?: string) => ['ruta', userId];

export function useRuta() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: key(userId),
    enabled: !!userId,
    queryFn: async (): Promise<RutaState> => {
      const { data, error } = await supabase.rpc('route_state');
      if (error) throw error;
      return data as RutaState;
    },
  });
}

function useRutaMutation<V>(fn: (v: V) => Promise<RutaState>) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => qc.setQueryData(key(userId), state),
  });
}

export function useJoinRuta() {
  return useRutaMutation(async () => {
    const { data, error } = await supabase.rpc('route_join');
    if (error) throw error;
    return data as RutaState;
  });
}

export function useSwapRuta() {
  return useRutaMutation(async (v: { out: string; in: string }) => {
    const { data, error } = await supabase.rpc('route_swap', { p_out: v.out, p_in: v.in });
    if (error) throw error;
    return data as RutaState;
  });
}

export function usePickDoubleDay() {
  return useRutaMutation(async (day: string) => {
    const { data, error } = await supabase.rpc('route_pick_double_day', { p_day: day });
    if (error) throw error;
    return data as RutaState;
  });
}

export function useRutaSwapOptions(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['ruta-opciones', userId],
    enabled: !!userId && enabled,
    queryFn: async (): Promise<RutaOption[]> => {
      const { data, error } = await supabase.rpc('route_swap_options');
      if (error) throw error;
      return (data ?? []) as RutaOption[];
    },
  });
}

export type MarkVisitResult = { ok: boolean; reason?: string; distance_m?: number };

export function useMarkRutaVisit() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (v: { businessId: string; code: string; lat: number | null; lng: number | null }): Promise<MarkVisitResult> => {
      const { data, error } = await supabase.rpc('route_mark_visit', { p_business: v.businessId, p_code: v.code, p_lat: v.lat, p_lng: v.lng });
      if (error) throw error;
      return data as MarkVisitResult;
    },
    onSuccess: (r) => {
      if (r.ok) qc.invalidateQueries({ queryKey: key(userId) });
    },
  });
}

export const RUTA_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function rutaMonthName(month: string) {
  return RUTA_MONTHS[Number(month.slice(5, 7)) - 1] ?? '';
}
export function rutaMonthShort(month: string) {
  return rutaMonthName(month).slice(0, 3).toUpperCase();
}
export function rutaDone(s?: RutaState | null) {
  return (s?.stops ?? []).filter((x) => x.visit === 'confirmed').length;
}

// Premio del sorteo del mes (0089). Lo carga el admin; si no hay (o el servidor todavía no lo tiene), es null.
export type RutaPrize = {
  month: string;
  title: string;
  detail: string | null;
  image_url: string | null;
  sponsor: { id: string; name: string; logo_url: string | null } | null;
  winners_count: number;
  drawn_at: string | null;
  winners: { name: string; ticket_no: number }[];
  tickets: number;
};

export function useRutaPrize(month?: string | null) {
  return useQuery({
    queryKey: ['ruta-prize', month ?? 'actual'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RutaPrize | null> => {
      const { data, error } = await supabase.rpc('route_prize', month ? { p_month: month } : {});
      if (error) return null;
      const p = data as RutaPrize | null;
      // Solo vale si trae título (si el servidor responde otra cosa, no se muestra nada).
      return p && typeof p.title === 'string' && p.title ? p : null;
    },
  });
}

// Mes anterior ("2026-11-01" → "2026-10-01"), para mostrar los ganadores del sorteo pasado.
export function prevRutaMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
}

// Ganadores del sorteo del mes pasado (solo si ya se sorteó).
export function useLastRutaWinners(month?: string | null) {
  const q = useRutaPrize(month ? prevRutaMonth(month) : null);
  return q.data && q.data.drawn_at ? q.data : null;
}
