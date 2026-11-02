import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { localDay } from '@/lib/format';
import { boliviaToday } from '@/lib/bolivia';
import { fetchMemberSteps } from '@/lib/group-steps';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroups } from '@/hooks/useGroups';

function startOfWeekLocal() {
  const d = boliviaToday();
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Ranking real dentro del grupo del usuario (no hay ranking global todavía —
// haría falta agregar pasos de TODOS los usuarios de Camina, que no tiene
// sentido hasta que haya más de un comercio y una base de usuarios real).
export function useMyGroupRanking() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: groups } = useGroups();
  const myGroup = (groups ?? []).find((g) =>
    g.group_members.some((m: { user_id: string }) => m.user_id === userId)
  );

  return useQuery({
    queryKey: ['group-ranking', myGroup?.id],
    enabled: !!myGroup,
    queryFn: async () => {
      const memberIds: string[] = myGroup!.group_members.map((m: { user_id: string }) => m.user_id);
      const monday = startOfWeekLocal();

      const [steps, { data: profiles, error: profilesError }] = await Promise.all([
        fetchMemberSteps(memberIds, localDay(monday)),
        supabase.from('public_profiles').select('id, full_name').in('id', memberIds),
      ]);
      if (profilesError) throw profilesError;

      const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));
      for (const row of steps) {
        totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.steps);
      }
      const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      const ranked = [...totals.entries()]
        .map(([id, total]) => ({ id, name: names.get(id) ?? 'Caminante', total }))
        .sort((a, b) => b.total - a.total);

      const myIndex = ranked.findIndex((r) => r.id === userId);
      return { group: myGroup!, ranked, myPosition: myIndex >= 0 ? myIndex + 1 : null };
    },
  });
}
