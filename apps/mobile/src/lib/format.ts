import { boliviaDay, boliviaToday } from '@/lib/bolivia';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "2026-10-04" del día LOCAL de `d`. toISOString() da el día en UTC y, de noche en Bolivia
// (UTC-4), ya es "mañana": un paso o un premio de las 21:00 caería en el día equivocado.
export function localDay(d?: Date): string {
  if (!d) return boliviaDay(); // hoy = hoy en Bolivia, sin importar la zona del celular
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// plural(1, 'paso', 'pasos') → 'paso'; plural(0 | 2 | …) → 'pasos'.
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// "Hoy" / "Ayer" / "Sáb 5 sep" — mismo criterio que usa el resto de la app
// para mostrar fechas de actividad (Puntos, Actividad).
export function dayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = boliviaToday();
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}
