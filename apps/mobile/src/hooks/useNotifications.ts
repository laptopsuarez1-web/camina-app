import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type AppNotification = { id: string; title: string; body: string; created_at: string; data?: { type?: string } | null };

const seenKey = (userId: string) => `camina_notifications_seen_${userId}`;

// "Leído hasta" compartido por todas las campanitas (cada pantalla de las pestañas monta la suya):
// si cada una tuviera su propio estado, marcar los avisos como vistos no apagaría el puntito en las demás.
// Lleva el userId para que el valor de otra cuenta nunca se use.
const useSeenStore = create<{ userId: string | null; seenAt: string | null }>(() => ({ userId: null, seenAt: null }));

// Bandeja de avisos de la campanita.
export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const seenAt = useSeenStore((s) => (s.userId === userId ? s.seenAt : null));

  useEffect(() => {
    if (!userId) return;
    if (useSeenStore.getState().userId !== userId) useSeenStore.setState({ userId, seenAt: null });
    AsyncStorage.getItem(seenKey(userId))
      .then((saved) => {
        const s = useSeenStore.getState();
        if (!saved || s.userId !== userId) return;
        // Si ya se marcó como visto en esta sesión, vale el más reciente.
        if (!s.seenAt || saved > s.seenAt) useSeenStore.setState({ seenAt: saved });
      })
      .catch(() => {});
  }, [userId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications_outbox')
        .select('id, title, body, created_at, data')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AppNotification[];
    },
  });
  const items = data ?? [];
  const unread = items.filter((n) => !seenAt || n.created_at > seenAt).length;

  const markAllSeen = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    useSeenStore.setState({ userId, seenAt: now });
    await AsyncStorage.setItem(seenKey(userId), now).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }, [userId, queryClient]);

  return { items, unread, seenAt, markAllSeen, isLoading, isError, refetch };
}
