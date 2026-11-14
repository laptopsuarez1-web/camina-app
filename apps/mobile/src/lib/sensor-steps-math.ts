// Cuentas del contador de pasos del teléfono (Android), sin nada de React Native para poder probarlas.
// El contador da los pasos desde que se prendió el celular. Camina anota el número cada vez que lo lee; la diferencia
// entre dos lecturas son los pasos de ese rato, y se reparten entre los días que abarca ese rato según el tiempo.

export type SensorState = {
  boot: number | null; // cuándo se prendió el celular (ms) en la última lectura (solo informativo)
  last: number | null; // número del contador en la última lectura
  at: number | null; // cuándo fue la última lectura (ms)
  days: Record<string, number>; // pasos acumulados por día (YYYY-MM-DD de Bolivia)
};

export const EMPTY_SENSOR_STATE: SensorState = { boot: null, last: null, at: null, days: {} };

// Un rato entre dos lecturas no puede tener más pasos que esto: si pasa, es un dato raro y no se suma.
const MAX_DELTA = 100_000;
// Nadie camina más rápido que esto de forma sostenida (correr rápido son unos 180 pasos por minuto).
const MAX_STEPS_PER_MIN = 250;
// Margen para lecturas muy seguidas.
const RATE_SLACK = 300;
const DAYS_KEPT = 4;

type DayFns = { dayOf: (ms: number) => string; startOfDay: (ms: number) => number };

// Reparte `steps` entre los días del rato [from, to] en proporción al tiempo de cada día.
export function splitByDay(steps: number, from: number, to: number, fns: DayFns): Record<string, number> {
  const out: Record<string, number> = {};
  if (steps <= 0) return out;
  if (!(to > from)) {
    out[fns.dayOf(to)] = steps;
    return out;
  }
  const total = to - from;
  let cursor = from;
  let given = 0;
  while (cursor < to) {
    const day = fns.dayOf(cursor);
    let next = fns.startOfDay(cursor) + 36 * 3_600_000; // salta al día siguiente y vuelve a su medianoche
    next = Math.min(fns.startOfDay(next), to);
    if (next <= cursor) next = to;
    const share = next >= to ? steps - given : Math.round((steps * (next - cursor)) / total);
    out[day] = (out[day] ?? 0) + share;
    given += share;
    cursor = next;
  }
  return out;
}

// Aplica una lectura nueva del contador y devuelve el estado nuevo.
export function applyReading(state: SensorState, reading: { count: number; bootMs: number }, now: number, fns: DayFns): SensorState {
  const { count, bootMs } = reading;
  if (!Number.isFinite(count) || count < 0) return state;
  let delta = 0;
  let from = now;
  const known = state.last != null && state.at != null;
  // El contador solo vuelve atrás si el celular se reinició. La hora de encendido NO se usa para decidirlo: se calcula
  // con el reloj del teléfono, y alguien podría cambiar la hora para que parezca un reinicio y cobrar los pasos dos veces.
  if (known && count >= state.last!) {
    delta = count - state.last!;
    from = state.at!;
  } else if (known) {
    // Se reinició el celular: el contador volvió a cero, todo lo que marca es posterior al encendido.
    delta = count;
    from = Math.max(bootMs, state.at!);
  } else if (bootMs >= fns.startOfDay(now) && bootMs <= now) {
    // Primera lectura y el celular se prendió hoy: lo que marca es de hoy.
    delta = count;
    from = bootMs;
  }
  // Tope por tiempo: en un rato no se pueden haber caminado más pasos que los posibles a paso de carrera.
  if (delta > MAX_DELTA) delta = 0; // dato raro del teléfono: no se suma
  const minutes = Math.max(0, (now - Math.min(from, now)) / 60_000);
  delta = Math.min(delta, Math.floor(minutes * MAX_STEPS_PER_MIN) + RATE_SLACK);
  // Primera lectura con el celular prendido desde antes de hoy: solo se toma como punto de partida.
  const days = { ...state.days };
  if (delta > 0 && delta <= MAX_DELTA) {
    for (const [day, n] of Object.entries(splitByDay(delta, Math.min(from, now), now, fns))) days[day] = (days[day] ?? 0) + n;
  }
  const keep = Object.keys(days).sort().slice(-DAYS_KEPT);
  return { boot: bootMs, last: count, at: now, days: Object.fromEntries(keep.map((d) => [d, days[d]])) };
}
