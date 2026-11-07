// Orden de los locales en Canjes ("Locales cerca tuyo" y la lista): por cercanía, y los destacados siempre entre los
// primeros, pero según qué tan cerca estén. Así un destacado que está lejos no aparece primero delante de uno que
// tienes en la esquina:
//   - destacado cerca (menos de 800 m): puede ir 1.º
//   - a media distancia (hasta 2,5 km): como mucho 2.º
//   - lejos: como mucho 3.º
// Nunca baja de donde le tocaría solo por distancia. Sin ubicación, los destacados van primero.
export const NEAR_M = 800;
export const MID_M = 2500;

export function featuredSlot(distance: number): number {
  return distance < NEAR_M ? 0 : distance < MID_M ? 1 : 2;
}

export function rankLocales<T>(items: T[], dist: (x: T) => number | null, featured: (x: T) => boolean, name: (x: T) => string): T[] {
  const byName = (a: T, b: T) => name(a).localeCompare(name(b));
  if (!items.some((x) => dist(x) != null)) {
    return [...items].sort((a, b) => Number(featured(b)) - Number(featured(a)) || byName(a, b));
  }
  const d = (x: T) => dist(x) ?? Infinity;
  const base = [...items].sort((a, b) => d(a) - d(b) || byName(a, b));
  const stars = base.filter(featured);
  const out = base.filter((x) => !featured(x));
  let minSlot = 0;
  for (const s of stars) {
    // El lugar que le toca: el del nivel por distancia, pero nunca peor que por distancia pura, y después del destacado anterior.
    const byDistance = base.indexOf(s);
    const slot = Math.max(minSlot, Math.min(byDistance, featuredSlot(d(s))));
    out.splice(Math.min(slot, out.length), 0, s);
    minSlot = slot + 1;
  }
  return out;
}
