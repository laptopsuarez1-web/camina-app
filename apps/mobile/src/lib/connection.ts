import type { QueryClient } from '@tanstack/react-query';
import { useConnectionStore } from '@/store/useConnectionStore';

// Errores de red (sin internet o sin señal), no errores del servidor.
export function isNetworkError(error: unknown): boolean {
  const e = (error ?? {}) as { message?: unknown; name?: unknown };
  const message = typeof e.message === 'string' ? e.message : '';
  return e.name === 'AuthRetryableFetchError' || /network request failed|failed to fetch|network error|load failed/i.test(message);
}

const PING_MS = 8000;

// Mira los pedidos de la app para saber si hay conexión. Sin conexión, prueba cada 8 s; al volver, recarga lo que falló.
// Devuelve la función para dejar de mirar.
export function watchConnection(client: QueryClient): () => void {
  const store = useConnectionStore;
  let timer: ReturnType<typeof setInterval> | null = null;
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/auth/v1/health`;

  const stopPing = () => { if (timer) { clearInterval(timer); timer = null; } };
  const back = () => {
    if (!store.getState().offline) return;
    store.getState().setOffline(false);
    stopPing();
    client.invalidateQueries({ predicate: (q) => q.state.status === 'error' || q.getObserversCount() > 0 }).catch(() => {});
  };
  const lost = () => {
    store.getState().setOffline(true);
    if (timer) return;
    timer = setInterval(() => {
      // Cualquier respuesta del servidor (aunque sea un error) significa que volvió la conexión.
      fetch(url, { method: 'GET' }).then(back).catch(() => {});
    }, PING_MS);
  };

  const onEvent = (state: { status: string; error: unknown }) => {
    if (state.status === 'error' && isNetworkError(state.error)) lost();
    else if (state.status === 'success') back();
  };
  const offQ = client.getQueryCache().subscribe((ev) => { if (ev.type === 'updated') onEvent(ev.query.state); });
  const offM = client.getMutationCache().subscribe((ev) => { if (ev.type === 'updated') onEvent(ev.mutation.state); });
  return () => { offQ(); offM(); stopPing(); };
}
