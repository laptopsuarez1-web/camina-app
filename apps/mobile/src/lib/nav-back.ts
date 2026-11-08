import { router } from 'expo-router';

type TabNav = { getState: () => { index: number; routes: { key: string; name: string; params?: object }[]; history?: { type: string; key: string }[] }; navigate: (name: string, params?: object) => void };

// Las pantallas de Camina son pestañas con `backBehavior="history"`: "atrás" vuelve a la última pantalla visitada, y eso
// incluía los pasos de un asistente ya terminado (Grupo nuevo, Nuevo desafío…) que seguían montados con lo escrito.
// Esto vuelve a la última pantalla visitada que NO sea uno de esos pasos; si no hay ninguna, va a `fallback`.
export function backSkipping(nav: TabNav, skip: string[], fallback: string) {
  const st = nav.getState();
  const hist = st.history ?? [];
  const cur = st.routes[st.index]?.key;
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (h.type !== 'route' || h.key === cur) continue;
    const r = st.routes.find((x) => x.key === h.key);
    if (r && !skip.includes(r.name)) {
      nav.navigate(r.name, r.params);
      return;
    }
  }
  router.replace(fallback as never);
}

// Pasos de asistentes de Grupos: nunca son un destino al volver atrás.
export const WIZARD_STEPS = ['grupos/nuevo', 'grupos/nuevo-meta', 'grupos/nuevo-desafio', 'grupos/agregar'];
