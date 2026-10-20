// Textos de desafíos, eventos y publicidad de comercios (tarjetas de Inicio y de Eventos y Desafíos).
import { plural } from '@/lib/format';

export type PromoKind = 'evento' | 'sorteo' | 'desafio' | 'publicidad';
export type PromoBg = 'violeta' | 'menta' | 'dorado' | 'noche' | 'coral' | 'aurora' | 'clasico';

export interface PromoGoal {
  goal_mode: 'daily' | 'total' | null;
  goal_steps: number | null;
  goal_days: number | null;
  // Regla vieja (sorteos de antes): X pasos por día durante Y días.
  req_steps: number | null;
  req_days: number | null;
}

// Colores de Camina para el fondo de la tarjeta (todos con texto blanco legible, 4,5:1 o más).
export const PROMO_BG: Record<PromoBg, readonly [string, string]> = {
  violeta: ['#5B31A3', '#8B4FD1'],
  menta: ['#1A6555', '#2F9A83'],
  dorado: ['#5F4004', '#8F6307'],
  noche: ['#241748', '#3a2668'],
  coral: ['#9E2F3A', '#BF3F3F'],
  // Fondos clásicos de Camina: aurora (violeta a menta) y el degradé oscuro de las cabeceras de la app.
  aurora: ['#3a2668', '#1F7A66'],
  clasico: ['#3a2668', '#120a1e'],
};

export function promoBgKey(v: string | null | undefined): PromoBg {
  return v && v in PROMO_BG ? (v as PromoBg) : 'violeta';
}

const DAY = 24 * 3600 * 1000;

// "Termina en 2 días", "Último día", "Termina hoy", "Empieza en 3 días".
export function timeLeftLabel(startsAt: string, endsAt: string, now: Date = new Date()): string {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const t = now.getTime();
  if (t < start) {
    const d = Math.ceil((start - t) / DAY);
    return d <= 1 ? 'Empieza mañana' : `Empieza en ${d} días`;
  }
  if (t > end) return 'Terminó';
  const hours = (end - t) / 3600000;
  if (hours < 24) return hours < 1 ? 'Termina en menos de 1 hora' : `Termina en ${Math.floor(hours)} h`;
  const d = Math.floor(hours / 24);
  return d === 1 ? 'Termina mañana' : `Termina en ${d} días`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "18 – 20 oct" o "28 oct – 2 nov". Usa la hora de Bolivia (UTC-4) para que no cambie según el celular.
export function dateRangeLabel(startsAt: string, endsAt: string): string {
  const a = boliviaDate(startsAt);
  const b = boliviaDate(endsAt);
  if (a.month === b.month) return a.day === b.day ? `${a.day} ${MONTHS[a.month]}` : `${a.day} – ${b.day} ${MONTHS[b.month]}`;
  return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]}`;
}

export function boliviaDate(iso: string): { day: number; month: number } {
  const d = new Date(new Date(iso).getTime() - 4 * 3600000);
  return { day: d.getUTCDate(), month: d.getUTCMonth() };
}

export function boliviaTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 4 * 3600000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function fmtSteps(n: number): string {
  return n.toLocaleString('es-BO');
}

// La meta partida en lo grande y lo chico: { big: '8.000', small: 'pasos por día, durante 3 días' }.
export function goalParts(g: PromoGoal): { big: string; small: string } | null {
  if (g.goal_mode === 'daily' && g.goal_steps && g.goal_days) {
    return { big: fmtSteps(g.goal_steps), small: `pasos por día, durante ${g.goal_days} ${plural(g.goal_days, 'día', 'días')}` };
  }
  if (g.goal_mode === 'total' && g.goal_steps) return { big: fmtSteps(g.goal_steps), small: 'pasos en total' };
  if (g.req_steps && g.req_days) {
    return { big: fmtSteps(g.req_steps), small: `pasos por día, durante ${g.req_days} ${plural(g.req_days, 'día', 'días')}` };
  }
  return null;
}

// "+120 se sumaron" / "Sé de los primeros" / "1 persona se sumó".
export function participantsLabel(n: number): string {
  if (n <= 0) return 'Sé de los primeros en sumarte';
  if (n === 1) return '1 persona se sumó';
  return `+${fmtSteps(n)} se sumaron`;
}
