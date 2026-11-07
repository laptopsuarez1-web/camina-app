import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { celebrate } from '@/store/useCelebrationStore';
import { rutaMonthName, rutaMonthShort, useRutaPrize, type RutaState } from '@/hooks/useRuta';

// La primera vez que la app ve la Ruta del mes completada (el local confirmó la 3.ª visita), sale la escena de festejo.
// Una vez por mes y por teléfono.
const shownThisSession = new Set<string>();
export function useRutaDoneCelebration(state: RutaState | undefined | null) {
  const { data: prize } = useRutaPrize(state?.month);
  const month = state?.month;
  const done = !!state?.completed_at;
  useEffect(() => {
    if (!state || !done || !month || shownThisSession.has(month)) return;
    const key = `camina.rutaDone.${month}`;
    let alive = true;
    AsyncStorage.getItem(key)
      .then((v) => {
        if (!alive || v || shownThisSession.has(month)) return;
        shownThisSession.add(month);
        AsyncStorage.setItem(key, '1').catch(() => {});
        celebrate({
          kind: 'ruta-done',
          month: rutaMonthName(month),
          monthShort: rutaMonthShort(month),
          monthIso: month,
          stops: state.stops.map((s) => ({ name: s.name, logo_url: s.logo_url })),
          ticket: state.ticket_no,
          prize: prize?.title ?? null,
          onSeeBadge: () => router.push({ pathname: '/(tabs)/ruta-mes', params: { m: month } }),
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [state, done, month, prize?.title]);
}

// Cada local confirmado (1 de 3, 2 de 3) tiene su escena, una vez por local y por mes. El 3.º lo festeja la escena de arriba.
const stopsShown = new Set<string>();
export function useRutaStopCelebration(state: RutaState | undefined | null, onShare?: (businessId: string) => void, onPhoto?: (businessId: string) => void) {
  useEffect(() => {
    if (!state || state.completed_at) return;
    const confirmed = state.stops.filter((s) => s.visit === 'confirmed');
    if (!confirmed.length || confirmed.length >= 3) return;
    let alive = true;
    const keys = confirmed.map((s) => `camina.rutaStop.${state.month}.${s.business_id}`);
    AsyncStorage.multiGet(keys)
      .then((rows) => {
        if (!alive) return;
        // Solo el último que falta festejar (si se confirmaron dos de golpe, se festeja uno y se marcan los dos).
        const pending = rows.filter(([k, v]) => !v && !stopsShown.has(k));
        if (!pending.length) return;
        pending.forEach(([k]) => stopsShown.add(k));
        AsyncStorage.multiSet(pending.map(([k]) => [k, '1'] as [string, string])).catch(() => {});
        const s = confirmed[keys.indexOf(pending[pending.length - 1][0])];
        celebrate({
          kind: 'ruta-stop',
          month: rutaMonthName(state.month),
          monthShort: rutaMonthShort(state.month),
          name: s.name,
          logo_url: s.logo_url,
          done: confirmed.length,
          stops: state.stops.map((x) => ({ name: x.name, logo_url: x.logo_url, done: x.visit === 'confirmed' && x.business_id !== s.business_id, now: x.business_id === s.business_id })),
          onShare: onShare ? () => onShare(s.business_id) : undefined,
          onPhoto: onPhoto ? () => onPhoto(s.business_id) : undefined,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
