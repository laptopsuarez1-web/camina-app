import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type ChallengeRule = 'steps' | 'days' | 'streak';

export const RULE_LABEL: Record<ChallengeRule, string> = {
  steps: 'Más pasos',
  days: 'Más días',
  streak: 'Mejor racha',
};

export interface Challenge {
  id: string;
  group_id: string;
  name: string;
  rule: ChallengeRule;
  daily_goal: number;
  start_day: string;
  end_day: string;
  stake: number;
  status: 'active' | 'finished';
}

export interface Standing {
  user_id: string;
  steps: number;
  goal_days: number;
  best_streak: number;
  met_goal: boolean;
}

function ruleValue(rule: ChallengeRule, s: Standing) {
  return rule === 'steps' ? s.steps : rule === 'days' ? s.goal_days : s.best_streak;
}

// Desafío en curso del grupo, quiénes están dentro y cómo va cada uno.
export function useGroupChallenge(groupId: string | undefined) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['group-challenge', groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('group_challenges')
        .select('id, group_id, name, rule, daily_goal, start_day, end_day, stake, status')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false })
        .limit(2);
      if (error || !rows) return null;
      const list = rows as unknown as Challenge[];
      const active = list.find((c) => c.status === 'active') ?? null;
      if (!active) return { active: null, entries: 0, joined: false, standings: [] as Standing[], lastFinished: list[0] ?? null };

      const [{ data: entries }, { data: progress }] = await Promise.all([
        supabase.from('group_challenge_entries').select('user_id').eq('challenge_id', active.id),
        supabase.rpc('challenge_progress', { p_challenge: active.id }),
      ]);
      const standings = ((progress ?? []) as unknown as Standing[]).slice().sort(
        (a, b) => ruleValue(active.rule, b) - ruleValue(active.rule, a) || b.steps - a.steps
      );
      return {
        active,
        entries: (entries ?? []).length,
        joined: (entries ?? []).some((e: { user_id: string }) => e.user_id === userId),
        standings,
        lastFinished: null,
      };
    },
  });
}

export function useJoinChallenge(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.rpc('join_group_challenge', { p_challenge: challengeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-challenge', groupId] });
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
    },
  });
}

export function daysLeft(endDay: string) {
  const end = new Date(endDay + 'T23:59:59');
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}
