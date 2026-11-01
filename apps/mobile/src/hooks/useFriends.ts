import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { FriendDay } from '@/lib/friend-week';

// Amigos (supabase/migrations/0056_friends_ranking_bio.sql). La amistad es mutua: alguien manda la solicitud y la otra persona
// acepta. Los pasos, la racha y el calendario de una persona solo los ven sus amigos; todo se lee con funciones del servidor.
export interface Friend {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  friends_since: string | null;
  week_steps: number;
  streak: number;
}
export interface FriendRequest { user_id: string; full_name: string; photo_url: string | null; created_at: string }
export interface FriendRank { user_id: string; full_name: string; photo_url: string | null; total_steps: number; streak: number; is_me: boolean }
export type FriendRelation = 'self' | 'friend' | 'pending_out' | 'pending_in' | 'none';
export interface FriendCard {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  relation: FriendRelation;
  bio: string | null;
  // Solo si es uno mismo o un amigo:
  friends_since?: string | null;
  streak?: number;
  goal?: number;
  avg_week?: number;
  days?: FriendDay[];
}
export interface GroupInvite { group_id: string; group_name: string; inviter_name: string | null; member_count: number; created_at: string }

const num = (v: unknown) => Number(v ?? 0);

export function useFriends() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['friends', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_friends');
      if (error) throw error;
      return ((data ?? []) as Friend[]).map((f) => ({ ...f, week_steps: num(f.week_steps), streak: num(f.streak) }));
    },
  });
}

export function useFriendRequests() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['friend-requests', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friend_requests_incoming');
      if (error) throw error;
      return (data ?? []) as FriendRequest[];
    },
  });
}

export function useFriendsRanking() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['friends-ranking', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friends_weekly_ranking');
      if (error) throw error;
      return ((data ?? []) as FriendRank[]).map((r) => ({ ...r, total_steps: num(r.total_steps), streak: num(r.streak) }));
    },
  });
}

// null = la persona no existe o hay un bloqueo entre ustedes (la app muestra "no disponible").
export function useFriendCard(personId: string | undefined) {
  return useQuery({
    queryKey: ['friend-card', personId],
    enabled: !!personId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friend_card', { p_user: personId! });
      if (error) throw error;
      return (data ?? null) as FriendCard | null;
    },
  });
}

// Puntos de la persona y grupos que tienen en común (migración 0076). Solo amigos; si la función todavía no existe, devuelve null y la ficha lo oculta.
export interface FriendExtras { points: number; common_groups: { id: string; name: string }[] }
export function useFriendExtras(personId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['friend-extras', personId],
    enabled: !!personId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friend_extras', { p_user: personId! });
      if (error) return null;
      return (data ?? null) as FriendExtras | null;
    },
  });
}

export function useFriendActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const key of ['friends', 'friend-requests', 'friends-ranking', 'friend-card']) queryClient.invalidateQueries({ queryKey: [key] });
  };
  const send = useMutation({
    mutationFn: async (personId: string) => {
      const { data, error } = await supabase.rpc('send_friend_request', { p_user: personId });
      if (error) throw error;
      return data as 'sent' | 'accepted' | 'friends' | 'pending' | 'unavailable';
    },
    onSuccess: refresh,
  });
  const respond = useMutation({
    mutationFn: async ({ personId, accept }: { personId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_friend_request', { p_user: personId, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_user: personId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { send, respond, remove };
}

// Invitaciones a grupos que te mandaron tus amigos.
export function useGroupInvites() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['group-invites', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pending_group_invites');
      if (error) throw error;
      return ((data ?? []) as GroupInvite[]).map((i) => ({ ...i, member_count: num(i.member_count) }));
    },
  });
}

export function useGroupInviteActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['group-invites'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };
  const accept = useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.rpc('accept_group_invite', { p_group: groupId });
      if (error) throw error;
      return (data ?? null) as string | null;
    },
    onSuccess: refresh,
  });
  const decline = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.rpc('decline_group_invite', { p_group: groupId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { accept, decline };
}

export function useInviteFriendsToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      const { data, error } = await supabase.rpc('invite_friends_to_group', { p_group: groupId, p_users: userIds });
      if (error) throw error;
      return num(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-invites'] }),
  });
}
