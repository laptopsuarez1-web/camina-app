import { calendarDayState, type CalendarState } from '@/lib/activity-calendar';

// Semana y mes de la ficha de un amigo: cada día como en el calendario de Actividad (met / miss / idle / none).
export interface FriendDay { day: string; steps: number; goal: number }
export interface DayCell { key: string; label: string; steps: number; state: CalendarState; isToday: boolean }

export const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Lunes de la semana de `todayKey` (la semana de Camina empieza el lunes).
export function mondayOf(todayKey: string): string {
  const d = parse(todayKey);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return keyOf(d);
}

// `weeks` semanas terminando en la actual (1 = esta semana; 5 = el mes), de lunes a domingo.
export function buildDayCells(days: FriendDay[], todayKey: string, weeks = 1): DayCell[] {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const firstDay = days.length ? days.reduce((a, d) => (d.day < a ? d.day : a), days[0].day) : todayKey;
  const start = parse(mondayOf(todayKey));
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const cells: DayCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = keyOf(d);
    const row = byDay.get(key);
    cells.push({
      key,
      label: WEEK_LABELS[i % 7],
      steps: row?.steps ?? 0,
      isToday: key === todayKey,
      state: calendarDayState({ key, todayKey, firstDay, opened: !!row, steps: row?.steps ?? 0, goal: row?.goal ?? Number.POSITIVE_INFINITY }),
    });
  }
  return cells;
}

// 4.600 -> "4,6k"; 740 -> "740" (para chicos espacios).
export function compactSteps(n: number): string {
  if (n < 1000) return String(n);
  return `${(Math.round(n / 100) / 10).toFixed(1).replace('.', ',')}k`;
}
