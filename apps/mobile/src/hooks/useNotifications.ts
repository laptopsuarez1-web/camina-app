import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type AppNotification = { id: string; title: string; body: string; created_at: string };

const seenKey = (userId: string) => `camina_notifications_seen_${userId}`;

// Bandeja de avisos de la campanita. Si la consulta falla (por ejemplo, antes de
// aplicar la migración) la lista queda vacía y no rompe nada.
export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(seenKey(userId)).then(setSeenAt).catch(() => {});
  }, [userId]);

  const { data } = useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications_outbox')
        .select('id, title, body, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [] as AppNotification[];
      return data as AppNotification[];
    },
  });
  const items = data ?? [];
  const unread = items.filter((n) => !seenAt || n.created_at > seenAt).length;

  const markAllSeen = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setSeenAt(now);
    await AsyncStorage.setItem(seenKey(userId), now).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }, [userId, queryClient]);

  return { items, unread, seenAt, markAllSeen };
}
