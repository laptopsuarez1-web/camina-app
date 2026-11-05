import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { localDay } from '@/lib/format';
import { useRuta } from '@/hooks/useRuta';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';

// Temporadas (migración 0087). El servidor decide si hay una (por ejemplo "navidad", del 1 al 31 de diciembre): la app
// no tiene fechas escritas, así que se prende y se apaga sola. Si el servidor todavía no tiene la migración, no hay temporada.
export type Season = {
  key: string;
  starts_on: string;
  ends_on: string;
  // true = la ve antes de tiempo porque es probador (app_season_testers)
  preview: boolean;
  // Próximo día doble para todos (el Aguinaldo del 25 de diciembre)
  double_day: { day: string; label: string; today: boolean } | null;
};

export function useSeason() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['season', userId],
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Season | null> => {
      const { data, error } = await supabase.rpc('season_now');
      if (error) return null;
      return (data as Season | null) ?? null;
    },
  });
}

export function useChristmas() {
  return useSeason().data?.key === 'navidad';
}

// ¿Hoy es Día doble? Por el Aguinaldo (para todos) o por el Día doble que se ganó en la Ruta del mes.
// Ese día cada 500 pasos dan 1 Punto y el tope es 40 (lo mismo que hace el servidor en earn_points_from_steps).
export function useDoubleToday() {
  const season = useSeason().data;
  const { data: ruta } = useRuta();
  return !!season?.double_day?.today || (!!ruta?.double_day && ruta.double_day === localDay());
}

export function pointsForSteps(steps: number, double: boolean) {
  const per = double ? POINTS_PER_STEP_UNIT / 2 : POINTS_PER_STEP_UNIT;
  const cap = double ? DAILY_POINTS_CAP * 2 : DAILY_POINTS_CAP;
  return { points: Math.min(Math.floor(steps / per), cap), per, cap };
}

// ---------- Árbol del grupo ----------
export type GroupTree = {
  from: string;
  to: string;
  goal: number; // luces para encender la estrella
  members: number;
  need: number; // cuántas personas tienen que cumplir su meta para encender la luz del día
  lights: number; // total de luces (una por día)
  lit: number;
  complete: boolean;
  days: { day: string; met: number; lit: boolean }[];
  today: { day: string; met: number; need: number; lit: boolean; met_ids: string[] } | null;
};

export function useGroupTree(groupId: string | undefined, enabled = true) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['group-tree', groupId, userId],
    enabled: !!groupId && !!userId && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<GroupTree | null> => {
      const { data, error } = await supabase.rpc('group_tree', { p_group: groupId });
      if (error) return null;
      return (data as GroupTree | null) ?? null;
    },
  });
}

export function useMyGroupTrees(enabled = true) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['group-trees', userId],
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Record<string, GroupTree>> => {
      const { data, error } = await supabase.rpc('my_group_trees');
      if (error || !Array.isArray(data)) return {};
      return Object.fromEntries((data as { group_id: string; tree: GroupTree }[]).map((r) => [r.group_id, r.tree]));
    },
  });
}
