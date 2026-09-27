import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { GroupNote } from '@/lib/database.types';

function startOfWeekLocal() {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useGroupDetail(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-detail', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const monday = startOfWeekLocal();
      const [{ data: group, error: groupError }, { data: members, error: membersError }] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId!).single(),
        supabase.from('group_members').select('user_id, joined_at').eq('group_id', groupId!),
      ]);
      if (groupError) throw groupError;
      if (membersError) throw membersError;

      const memberIds = (members ?? []).map((m) => m.user_id);
      const [{ data: profiles, error: profilesError }, { data: steps, error: stepsError }] = await Promise.all([
        supabase.from('public_profiles').select('id, full_name, photo_url').in('id', memberIds),
        supabase
          .from('steps_daily')
          .select('user_id, steps')
          .in('user_id', memberIds)
          .gte('day', monday.toISOString().slice(0, 10)),
      ]);
      if (profilesError) throw profilesError;
      if (stepsError) throw stepsError;

      const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));
      for (const row of steps ?? []) {
        totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.steps);
      }
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const ranked = memberIds
        .map((id) => ({
          id,
          name: profileMap.get(id)?.full_name ?? 'Caminante',
          photoUrl: profileMap.get(id)?.photo_url ?? null,
          steps: totals.get(id) ?? 0,
        }))
        .sort((a, b) => b.steps - a.steps);

      return { group: group!, members: ranked };
    },
  });
}

export function useGroupNotes(groupId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    // Realtime: los mensajes de otros miembros aparecen sin recargar.
    const channel = supabase
      .channel(`group-notes-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_notes', filter: `group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ['group-notes', groupId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ['group-notes', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_notes')
        .select('*, author:public_profiles(id, full_name, photo_url)')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as unknown as (GroupNote & { author: { id: string; full_name: string; photo_url: string | null } })[];
    },
  });
}

export function usePostGroupNote(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, text }: { userId: string; text: string }) => {
      if (!groupId) throw new Error('Sin grupo');
      const { error } = await supabase.from('group_notes').insert({ group_id: groupId, user_id: userId, text });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-notes', groupId] }),
  });
}
