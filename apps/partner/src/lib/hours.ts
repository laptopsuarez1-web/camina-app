// Horario semanal: índice 0 = lunes ... 6 = domingo.
export type DayHours = { from: string; to: string } | null;
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
      if (n && n.from === d.from && n.to === d.to) j++;
      else break;
    }
    const days = j === i ? DAY_SHORT[i] : j === i + 1 ? `${DAY_SHORT[i]} y ${DAY_SHORT[j]}` : `${DAY_SHORT[i]} a ${DAY_SHORT[j]}`;
    parts.push(`${days} ${d.from}–${d.to}`);
    i = j + 1;
  }
  return parts.join(' · ');
}
