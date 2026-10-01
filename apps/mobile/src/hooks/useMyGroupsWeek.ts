import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function startOfWeekLocal() {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface GroupWeek {
  total: number;
  walkedToday: number;
  myRank: number | null;
  avatars: { id: string; name: string; photoUrl: string | null }[];
}

// Resumen de la semana de cada grupo del usuario para la lista de Grupos:
// pasos sumados, cuántos caminaron hoy, tu puesto y las caras de los miembros.
export function useMyGroupsWeek(groups: { id: string; group_members: { user_id: string }[] }[], userId: string | undefined) {
  const ids = Array.from(new Set(groups.flatMap((g) => g.group_members.map((m) => m.user_id)))).sort();
  return useQuery({
    queryKey: ['my-groups-week', groups.map((g) => g.id).join(','), ids.length],
    enabled: groups.length > 0,
    queryFn: async () => {
      const monday = startOfWeekLocal().toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: steps, error: stepsError }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase.from('steps_daily').select('user_id, steps, day').in('user_id', ids).gte('day', monday),
        supabase.from('public_profiles').select('id, full_name, photo_url').in('id', ids),
      ]);
      if (stepsError) throw stepsError;
      if (profilesError) throw profilesError;

      const week = new Map<string, number>();
      const walkedToday = new Set<string>();
      for (const row of steps ?? []) {
        week.set(row.user_id, (week.get(row.user_id) ?? 0) + row.steps);
        if (row.day === today && row.steps > 0) walkedToday.add(row.user_id);
      }
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const result: Record<string, GroupWeek> = {};
      for (const g of groups) {
        const members = g.group_members
          .map((m) => ({ id: m.user_id, steps: week.get(m.user_id) ?? 0 }))
          .sort((a, b) => b.steps - a.steps);
        const myIndex = members.findIndex((m) => m.id === userId);
        result[g.id] = {
          total: members.reduce((sum, m) => sum + m.steps, 0),
          walkedToday: members.filter((m) => walkedToday.has(m.id)).length,
          myRank: myIndex >= 0 ? myIndex + 1 : null,
          avatars: members.slice(0, 4).map((m) => ({
            id: m.id,
            name: profileMap.get(m.id)?.full_name ?? 'Caminante',
            photoUrl: profileMap.get(m.id)?.photo_url ?? null,
          })),
        };
      }
      return result;
    },
  });
}
