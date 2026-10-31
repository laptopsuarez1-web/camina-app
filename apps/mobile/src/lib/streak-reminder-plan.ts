// Avisos de racha: cuándo y qué decir. Sin dependencias de la app para poder probarlo solo.
export const DAY_HOURS = [10, 12, 14, 16] as const;
export const NIGHT_HOURS = [19, 20, 21] as const;

export type StreakReminderSettings = { enabled: boolean; dayHour: number; nightHour: number };
export const DEFAULT_REMINDER_SETTINGS: StreakReminderSettings = { enabled: true, dayHour: 14, nightHour: 20 };

// Se programan solo los próximos días: si la persona no vuelve a abrir la app, los avisos se acaban solos.
export const REMINDER_DAYS_AHEAD = 4;

export type PlannedReminder = { id: string; date: Date; title: string; body: string };

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

// Devuelve una hora válida de la lista (por si lo guardado está corrupto o es de una versión anterior).
export function pickHour(value: unknown, allowed: readonly number[], fallback: number): number {
  return typeof value === 'number' && allowed.includes(value) ? value : fallback;
}

export function parseSettings(raw: string | null): StreakReminderSettings {
  if (!raw) return DEFAULT_REMINDER_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<StreakReminderSettings>;
    return {
      enabled: v.enabled !== false,
      dayHour: pickHour(v.dayHour, DAY_HOURS, DEFAULT_REMINDER_SETTINGS.dayHour),
      nightHour: pickHour(v.nightHour, NIGHT_HOURS, DEFAULT_REMINDER_SETTINGS.nightHour),
    };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function copy(kind: 'day' | 'night', streak: number, missing: number | null) {
  if (kind === 'day') {
    return streak > 0
      ? { title: 'Tu racha sigue viva 🔥', body: `Llevas ${streak} ${streak === 1 ? 'día' : 'días'} seguidos. Sal a caminar un rato y no la cortes.` }
      : { title: 'Hoy es buen día para caminar', body: 'Cumple tu meta y empieza una racha nueva.' };
  }
  const falta = missing && missing > 0 ? ` Te faltan ${missing.toLocaleString('es-BO')} pasos.` : '';
  return streak > 0
    ? { title: 'Última llamada para tu racha', body: `Aún estás a tiempo de mantener tus ${streak} ${streak === 1 ? 'día' : 'días'}.${falta}` }
    : { title: 'Todavía estás a tiempo', body: `Camina hasta tu meta antes de que acabe el día.${falta}` };
}

// `streak` = días seguidos hasta ayer o hoy; `metToday` = hoy ya llegó a la meta; `missing` = pasos que faltan hoy.
// Hoy solo se avisa lo que todavía no pasó y solo si no cumplió la meta. Los días siguientes, siempre.
export function planStreakReminders(
  now: Date,
  s: StreakReminderSettings,
  o: { streak: number; metToday: boolean; missing: number | null },
): PlannedReminder[] {
  if (!s.enabled) return [];
  const out: PlannedReminder[] = [];
  for (let i = 0; i <= REMINDER_DAYS_AHEAD; i++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(base);
    for (const kind of ['day', 'night'] as const) {
      const hour = kind === 'day' ? s.dayHour : s.nightHour;
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0);
      if (date.getTime() <= now.getTime() + 60_000) continue;
      if (i === 0 && o.metToday) continue;
      // La racha que se cuenta mañana es la de hoy si hoy la cumplió; para días lejanos se usa la de ahora.
      const streak = o.streak;
      const { title, body } = copy(kind, streak, i === 0 ? o.missing : null);
      out.push({ id: `camina-racha-${key}-${kind}`, date, title, body });
    }
  }
  return out;
}
