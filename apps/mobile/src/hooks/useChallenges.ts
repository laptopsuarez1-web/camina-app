import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { localDay } from '@/lib/format';

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
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['points-expiring-soon'] });
    },
  });
}

// Días que faltan DESPUÉS de hoy: el último día del desafío da 0 ("último día"), el anterior da 1.
export function daysLeft(endDay: string, today: string = localDay()) {
  return Math.max(0, Math.round((Date.parse(endDay) - Date.parse(today)) / 86400000));
}

// Mi resultado en el último desafío terminado del grupo, con el podio, para la cinemática del cierre (se muestra una sola vez).
export interface ChallengeResultRow {
  user_id: string;
  steps: number;
  goal_days: number;
  best_streak: number;
  rank: number;
  payout: number;
}

export function useMyChallengeResult(groupId: string | undefined) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['group-challenge-result', groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      const { data: ch } = await supabase
        .from('group_challenges')
        .select('id, name, rule, start_day, end_day')
        .eq('group_id', groupId!)
        .eq('status', 'finished')
        .order('settled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ch) return null;
      const { data: rows } = await supabase
        .from('group_challenge_results')
        .select('user_id, steps, goal_days, best_streak, rank, payout')
        .eq('challenge_id', ch.id)
        .order('rank', { ascending: true });
      const results = (rows ?? []) as unknown as ChallengeResultRow[];
      const mine = results.find((r) => r.user_id === userId);
      if (!mine) return null;
      const days = Math.round((Date.parse(ch.end_day as string) - Date.parse(ch.start_day as string)) / 86400000) + 1;
      return {
        challengeId: ch.id as string,
        name: ch.name as string,
        rule: ch.rule as ChallengeRule,
        days,
        payout: mine.payout,
        rank: mine.rank,
        mine,
        results,
      };
    },
  });
}

// Valor de una persona con la regla del desafío, en palabras ("21.430 pasos", "5 días", "racha de 4").
export function ruleText(rule: ChallengeRule, r: { steps: number; goal_days: number; best_streak: number }) {
  if (rule === 'steps') return `${r.steps.toLocaleString('es-BO')} pasos`;
  if (rule === 'days') return `${r.goal_days} ${r.goal_days === 1 ? 'día' : 'días'}`;
  return `racha de ${r.best_streak}`;
}
