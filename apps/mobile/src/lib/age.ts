export const MIN_AGE = 13;

// Convierte día / mes / año escritos por la persona en una fecha ISO (AAAA-MM-DD), o null si no es válida.
export function birthToISO(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!d || !m || !y || year.length !== 4) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (date.getTime() > Date.now() || y < 1900) return null;
  return date.toISOString().slice(0, 10);
}

export function ageFromISO(iso: string): number {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}
