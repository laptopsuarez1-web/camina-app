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
