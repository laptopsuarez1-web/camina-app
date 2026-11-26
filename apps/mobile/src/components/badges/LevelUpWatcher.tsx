import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { celebrate } from '@/store/useCelebrationStore';
import { useMyBadges, type LocalLevel } from '@/hooks/useBadges';

// Mira tus insignias de locales y, si alguna subió de nivel desde la última vez (o ganaste una nueva), muestra el festejo una vez.
// Lo último visto se guarda en el teléfono por usuario. La primera vez solo se guarda, sin festejar lo que ya tenías.
const RANK: Record<LocalLevel, number> = { visitante: 1, habitual: 2, fan: 3 };
const MAX_PER_TIME = 2;
const key = (uid: string) => `camina_badge_levels_v1:${uid}`;

export function LevelUpWatcher() {
  const uid = useAuthStore((s) => s.session?.user.id);
  const { data, refetch } = useMyBadges();

  // Al volver a la app se revisa de nuevo (el comercio pudo confirmar un canje mientras tanto).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refetch(); });
    return () => sub.remove();
  }, [refetch]);

  useEffect(() => {
    if (!uid || !data?.locals) return;
    let cancelled = false;
    (async () => {
      let seen: Record<string, LocalLevel> | null = null;
      try {
        const raw = await AsyncStorage.getItem(key(uid));
        seen = raw ? JSON.parse(raw) : null;
      } catch {
        seen = null;
      }
      if (cancelled) return;
      const now: Record<string, LocalLevel> = {};
      for (const l of data.locals) now[l.business_id] = l.level;
      if (seen) {
        const ups = data.locals
          .filter((l) => RANK[l.level] > (seen![l.business_id] ? RANK[seen![l.business_id]] : 0))
          .sort((a, b) => RANK[b.level] - RANK[a.level])
          .slice(0, MAX_PER_TIME);
        for (const l of ups) {
          celebrate({ kind: 'level-up', businessName: l.name, logoUrl: l.logo_url, from: seen[l.business_id] ?? null, to: l.level, points: l.points });
        }
      }
      try {
        await AsyncStorage.setItem(key(uid), JSON.stringify(now));
      } catch {
        // Sin almacenamiento no pasa nada: a lo sumo se repite un festejo.
      }
    })();
    return () => { cancelled = true; };
  }, [uid, data]);

  return null;
}
