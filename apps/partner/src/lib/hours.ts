// Horario semanal: índice 0 = lunes ... 6 = domingo.
// Un día puede tener un solo tramo (de corrido) o dos (horario partido: mañana y tarde).
// from2/to2 son opcionales: los horarios viejos, con un solo tramo, siguen funcionando igual.
export type DayHours = { from: string; to: string; from2?: string; to2?: string } | null;
export type WeekHours = Record<string, DayHours>;

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function emptyWeek(): WeekHours {
  const w: WeekHours = {};
  for (let i = 0; i < 7; i++) w[String(i)] = null;
  return w;
}

// Si el comercio solo tenía un texto libre tipo "09:00 – 19:00", se propone lunes a viernes con ese horario.
export function weekFromText(text: string | null): WeekHours {
  const w = emptyWeek();
  const m = text?.match(/(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/);
  if (!m) return w;
  const pad = (t: string) => t.padStart(5, '0');
  for (let i = 0; i < 5; i++) w[String(i)] = { from: pad(m[1]), to: pad(m[2]) };
  return w;
}

// "08:00–12:00 y 14:30–21:00" (o solo el primer tramo si abre de corrido).
export function tramos(d: NonNullable<DayHours>): string {
  return d.from2 && d.to2 ? `${d.from}–${d.to} y ${d.from2}–${d.to2}` : `${d.from}–${d.to}`;
}

// "Lun a Vie 09:00–19:00 · Sáb 09:00–13:00" — resumen corto que se guarda también como texto.
export function summarizeWeek(week: WeekHours): string {
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    const d = week[String(i)];
    if (!d) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < 7) {
      const n = week[String(j + 1)];
      if (n && tramos(n) === tramos(d)) j++;
      else break;
    }
    const days = j === i ? DAY_SHORT[i] : j === i + 1 ? `${DAY_SHORT[i]} y ${DAY_SHORT[j]}` : `${DAY_SHORT[i]} a ${DAY_SHORT[j]}`;
    parts.push(`${days} ${tramos(d)}`);
    i = j + 1;
  }
  return parts.join(' · ');
}
