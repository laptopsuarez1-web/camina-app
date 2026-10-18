import { KCAL_PER_STEP, STEP_LENGTH_METERS, DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';

// Cuentas de las tarjetas para compartir (día, semana y mes). Todo se calcula en el teléfono con los mismos datos
// que ya muestra Actividad; acá no se toca la base.
export type SharePeriod = 'day' | 'week' | 'month';

export type ShareDay = { key: string; label: string; steps: number; met: boolean; isBest: boolean; isToday: boolean };

export type ShareStats = {
  period: SharePeriod;
  steps: number;
  days: number;
  avgPerDay: number;
  km: number;
  kcal: number;
  // Día con más pasos del período (null si todo es 0).
  best: { key: string; steps: number } | null;
  daysMet: number;
  // Días del período en que se abrió la app (los que cuentan para la meta y los Puntos).
  daysOpened: number;
  // Pasos contra el período anterior, en %. null si no hay con qué comparar.
  trendPct: number | null;
  // Meta de hoy y Puntos de hoy (solo se usan en la tarjeta del día).
  goalToday: number;
  pointsToday: number;
  bars: ShareDay[];
  rangeStart: string;
  rangeEnd: string;
};

const DIAS_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // 0 = lunes

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return r;
}

// Fechas del período que termina `today`: hoy; los últimos 7 días (igual que el gráfico de Actividad); o del 1.º del mes a hoy.
export function periodDates(period: SharePeriod, today: Date): Date[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === 'day') return [t];
  if (period === 'week') return Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  return Array.from({ length: t.getDate() }, (_, i) => new Date(t.getFullYear(), t.getMonth(), i + 1));
}

// Período anterior de igual largo, para comparar. Del mes: los mismos días del mes pasado.
function previousDates(period: SharePeriod, today: Date): Date[] {
  if (period === 'day') return [addDays(today, -1)];
  if (period === 'week') return periodDates('week', addDays(today, -7));
  const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const len = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  return Array.from({ length: Math.min(today.getDate(), len) }, (_, i) => addDays(first, i));
}

export function computeShareStats(args: {
  period: SharePeriod;
  today: Date;
  byDay: Map<string, number>;
  goalFor: (key: string) => number;
  openedDays: Set<string>;
}): ShareStats {
  const { period, today, byDay, goalFor, openedDays } = args;
  const todayKey = dayKey(today);
  const dates = periodDates(period, today);
  const stepsOf = (d: Date) => byDay.get(dayKey(d)) ?? 0;

  const steps = dates.reduce((a, d) => a + stepsOf(d), 0);
  let best: ShareStats['best'] = null;
  for (const d of dates) {
    const s = stepsOf(d);
    if (s > 0 && (!best || s > best.steps)) best = { key: dayKey(d), steps: s };
  }

  const bars: ShareDay[] = dates.map((d) => {
    const key = dayKey(d);
    const s = stepsOf(d);
    return {
      key,
      label: DIAS_CORTO[(d.getDay() + 6) % 7],
      steps: s,
      met: (key === todayKey || openedDays.has(key)) && s >= goalFor(key),
      isBest: best?.key === key,
      isToday: key === todayKey,
    };
  });

  const prev = previousDates(period, today);
  const prevSteps = prev.reduce((a, d) => a + stepsOf(d), 0);
  const todaySteps = stepsOf(today);

  return {
    period,
    steps,
    days: dates.length,
    avgPerDay: Math.round(steps / dates.length),
    km: (steps * STEP_LENGTH_METERS) / 1000,
    kcal: Math.round(steps * KCAL_PER_STEP),
    best,
    daysMet: bars.filter((b) => b.met).length,
    daysOpened: dates.filter((d) => dayKey(d) === todayKey || openedDays.has(dayKey(d))).length,
    trendPct: prevSteps > 0 ? Math.round(((steps - prevSteps) / prevSteps) * 100) : null,
    goalToday: goalFor(todayKey),
    pointsToday: Math.min(DAILY_POINTS_CAP, Math.floor(todaySteps / POINTS_PER_STEP_UNIT)),
    bars,
    rangeStart: dayKey(dates[0]),
    rangeEnd: dayKey(dates[dates.length - 1]),
  };
}

// Racha más larga de días seguidos con la meta cumplida dentro de `bars` (en orden), y desde qué día.
export function longestRun(bars: { key: string; met: boolean }[]): { length: number; from: string | null; to: string | null } {
  let best = { length: 0, from: null as string | null, to: null as string | null };
  let cur = 0;
  let start: string | null = null;
  for (const b of bars) {
    if (b.met) {
      if (cur === 0) start = b.key;
      cur += 1;
      if (cur > best.length) best = { length: cur, from: start, to: b.key };
    } else {
      cur = 0;
      start = null;
    }
  }
  return best;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function parse(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthName(monthIndex: number) {
  return MESES[monthIndex];
}

// "12–18 oct" o "28 sep–4 oct" cuando cruza de mes.
export function rangeLabel(startKey: string, endKey: string) {
  const a = parse(startKey);
  const b = parse(endKey);
  if (startKey === endKey) return `${b.getDate()} ${MESES_CORTO[b.getMonth()]}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MESES_CORTO[b.getMonth()]}`;
  return `${a.getDate()} ${MESES_CORTO[a.getMonth()]}–${b.getDate()} ${MESES_CORTO[b.getMonth()]}`;
}

// "Sáb 19" / "sábado 19 de septiembre".
export function shortDay(key: string) {
  const d = parse(key);
  return `${DIAS_ABREV[d.getDay()]} ${d.getDate()}`;
}
export function longDay(key: string) {
  const d = parse(key);
  return `${DIAS_LARGO[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
export function weekdayName(key: string) {
  const name = DIAS_LARGO[parse(key).getDay()];
  return name[0].toUpperCase() + name.slice(1);
}

// Puntos de un mes a partir del libro de Puntos: los de pasos por un lado y todo lo demás (racha, retos, invitaciones) por otro.
export function splitMonthPoints(rows: { amount: number; reason: string }[]) {
  let steps = 0;
  let bonus = 0;
  for (const r of rows) {
    if (r.amount <= 0 || r.reason === 'redemption') continue;
    if (r.reason === 'steps') steps += r.amount;
    else bonus += r.amount;
  }
  return { steps, bonus, total: steps + bonus };
}

// Formato de miles con punto, como en toda la app ("212.400").
export function fmtInt(n: number) {
  return Math.round(n).toLocaleString('es-BO');
}
export function fmtKm(km: number) {
  return km.toFixed(1).replace('.', ',');
}

// Cuándo avisar que el Wrapped está listo: el 1.º del mes a las 9:00 (hora del teléfono). Si hoy es el 1.º y todavía no son
// las 9:00, es hoy. `monthIndex` es el mes que terminó (el del Wrapped que se va a ver).
export function nextWrappedReminder(now: Date): { date: Date; monthIndex: number } {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0);
  if (now.getTime() < thisMonth.getTime()) return { date: thisMonth, monthIndex: (now.getMonth() + 11) % 12 };
  return { date: new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0), monthIndex: now.getMonth() };
}
