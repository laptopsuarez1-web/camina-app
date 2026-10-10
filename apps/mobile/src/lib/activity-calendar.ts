// Estado de cada día del calendario de Actividad.
// - met: abriste la app ese día y cumpliste la meta de ese día.
// - miss: abriste la app ese día y no llegaste a la meta.
// - idle: no abriste la app ese día. Los pasos de Salud no cuentan ni suman Puntos.
// - none: el futuro, días antes de usar la app y hoy mientras la meta sigue en curso.
export type CalendarState = 'met' | 'miss' | 'idle' | 'none';

export function calendarDayState(opts: {
  key: string; // YYYY-MM-DD
  todayKey: string;
  firstDay: string; // primer día con registro en la app
  opened: boolean; // hay registro de ese día en la base (la app sincronizó pasos)
  steps: number;
  goal: number;
}): CalendarState {
  const { key, todayKey, firstDay, opened, steps, goal } = opts;
  if (key > todayKey || key < firstDay) return 'none';
  if (key === todayKey) return steps >= goal ? 'met' : 'none';
  if (!opened) return 'idle';
  return steps >= goal ? 'met' : 'miss';
}
