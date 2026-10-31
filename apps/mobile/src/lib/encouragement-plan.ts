// Avisos de aliento del día: cuándo y qué decir. Sin dependencias de la app para poder probarlo solo.
// Un día solo cuenta si abriste la app (PR #90), por eso los textos lo recuerdan.
export const ENCOURAGEMENT_HOUR = 18;
export const ENCOURAGEMENT_MINUTE = 30;
// Hoy y los dos días siguientes: si la persona no vuelve a abrir la app, los avisos se acaban solos.
export const ENCOURAGEMENT_DAYS_AHEAD = 2;

export type PlannedEncouragement = { id: string; date: Date; title: string; body: string };

const nf = (n: number) => n.toLocaleString('es');

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Snapshot = { stepsToday: number; goal: number; pointsToday: number; pointsCap: number };

// Texto de hoy según cómo va el día; null = no hay nada que decir (ya llegó al tope de Puntos).
export function todayCopy(o: Snapshot): { title: string; body: string } | null {
  if (o.stepsToday < o.goal) {
    return {
      title: 'Todavía puedes sumar',
      body: `Te faltan ${nf(o.goal - o.stepsToday)} pasos para tu meta de hoy. Abre Camina para que cuenten.`,
    };
  }
  if (o.pointsToday < o.pointsCap) {
    return {
      title: '¡Bien hecho!',
      body: `Hoy llevas ${o.pointsToday} ${o.pointsToday === 1 ? 'Punto' : 'Puntos'}. Sigue caminando y suma hasta ${o.pointsCap}.`,
    };
  }
  return null;
}

export function planEncouragement(now: Date, o: Snapshot): PlannedEncouragement[] {
  const out: PlannedEncouragement[] = [];
  for (let i = 0; i <= ENCOURAGEMENT_DAYS_AHEAD; i++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), ENCOURAGEMENT_HOUR, ENCOURAGEMENT_MINUTE, 0);
    if (date.getTime() <= now.getTime() + 60_000) continue;
    const copy =
      i === 0
        ? todayCopy(o)
        : { title: 'Todavía estás a tiempo', body: `Camina hasta tu meta de ${nf(o.goal)} pasos y suma Puntos. Abre Camina para que cuenten.` };
    if (!copy) continue;
    out.push({ id: `camina-aliento-${dayKey(base)}`, date, ...copy });
  }
  return out;
}
