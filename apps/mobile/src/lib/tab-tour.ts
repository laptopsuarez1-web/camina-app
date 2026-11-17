import AsyncStorage from '@react-native-async-storage/async-storage';

// Recorrido corto de las pestañas para quien recién baja la app. Se muestra una sola vez.
export const TAB_TOUR_KEY = 'camina_tab_tour_seen';
export const PROFILE_HINT_KEY = 'camina_profile_hint_seen';

// El globito "Tu perfil está aquí" (Inicio) va primero: cuando se cierra, avisa para que arranque el recorrido.
const listeners = new Set<() => void>();
export function onProfileHintDone(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notifyProfileHintDone() {
  listeners.forEach((fn) => fn());
}

// ¿Es alguien nuevo? Todavía no vio el recorrido y tampoco el globito del perfil (que ya vio quien usa la app desde antes).
export async function isNewForTour(): Promise<{ eligible: boolean; hintPending: boolean }> {
  try {
    const [tour, hint] = await Promise.all([AsyncStorage.getItem(TAB_TOUR_KEY), AsyncStorage.getItem(PROFILE_HINT_KEY)]);
    return { eligible: !tour && !hint, hintPending: !hint };
  } catch {
    return { eligible: false, hintPending: false };
  }
}

export function markTourSeen() {
  AsyncStorage.setItem(TAB_TOUR_KEY, '1').catch(() => {});
}
