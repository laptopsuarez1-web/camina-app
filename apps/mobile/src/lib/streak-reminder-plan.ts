// Avisos de racha: cuándo y qué decir. Sin dependencias de la app para poder probarlo solo.
// Horarios fijos: los avisos los manda Camina, la persona no los configura.
export const DAY_HOUR = 14;
export const NIGHT_HOUR = 20;

// Se programan solo los próximos días: si la persona no vuelve a abrir la app, los avisos se acaban solos.
export const REMINDER_DAYS_AHEAD = 4;

export type PlannedReminder = { id: string; date: Date; title: string; body: string };

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
  o: { streak: number; metToday: boolean; missing: number | null },
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (let i = 0; i <= REMINDER_DAYS_AHEAD; i++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(base);
    for (const kind of ['day', 'night'] as const) {
      const hour = kind === 'day' ? DAY_HOUR : NIGHT_HOUR;
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
