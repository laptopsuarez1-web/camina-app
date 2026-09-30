import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export const REPORT_REASONS: { key: 'acoso' | 'sexual' | 'spam' | 'odio' | 'otro'; label: string }[] = [
  { key: 'acoso', label: 'Acoso o insultos' },
  { key: 'sexual', label: 'Contenido sexual' },
  { key: 'odio', label: 'Odio o discriminación' },
  { key: 'spam', label: 'Spam o publicidad' },
  { key: 'otro', label: 'Otro motivo' },
];

// Personas que bloqueaste (no ves sus mensajes).
export function useBlocks() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['blocks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId!);
      if (error || !data || data.length === 0) return [] as { id: string; name: string }[];
      const ids = data.map((b) => b.blocked_id);
      const { data: people } = await supabase.from('public_profiles').select('id, full_name').in('id', ids);
      const names = new Map((people ?? []).map((p) => [p.id as string, (p.full_name as string) ?? 'Persona']));
      return ids.map((id) => ({ id, name: names.get(id) ?? 'Persona' }));
    },
  });

  const block = useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.from('user_blocks').insert({ blocker_id: userId!, blocked_id: blockedId });
      if (error && !/duplicate/i.test(error.message)) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocks', userId] }),
  });
  const unblock = useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', userId!).eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocks', userId] }),
  });

  const ids = new Set((query.data ?? []).map((b) => b.id));
  return { list: query.data ?? [], ids, block, unblock };
}

export async function reportContent(kind: 'message' | 'photo' | 'user', targetUser: string | null, messageId: string | null, reason: string) {
  const { error } = await supabase.rpc('report_content', {
    p_kind: kind,
    p_target_user: targetUser,
    p_message: messageId,
    p_reason: reason,
  });
  if (error) throw error;
}
