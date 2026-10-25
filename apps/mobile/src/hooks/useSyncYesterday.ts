import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { syncYesterday } from '@/lib/steps-sync';

// Al abrir la app (con la fuente de pasos lista) manda también los pasos de ayer, una vez por apertura.
export function useSyncYesterday(live: boolean) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const doneFor = useRef<string | null>(null);

  useEffect(() => {
    if (!live || !userId || doneFor.current === userId) return;
    doneFor.current = userId;
    syncYesterday(userId)
      .then((sent) => { if (sent) queryClient.invalidateQueries({ queryKey: ['points-balance', userId] }); })
      .catch(() => { doneFor.current = null; });
  }, [live, userId, queryClient]);
}
