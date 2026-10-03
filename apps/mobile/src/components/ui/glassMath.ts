// Cuentas del vidrio, compartidas por las tarjetas (Glass) y la barra de abajo.
// amount: 0 = sólido, 1 = cristal. El valor por defecto (0,65) es el vidrio lila.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const LILAC = [167, 139, 250] as const;

export const glassOn = (amount: number) => amount > 0.04;

// Relleno de una tarjeta: [arriba, abajo].
export function cardFill(amount: number, dark: boolean, solidDark: string): [string, string] {
  if (!glassOn(amount)) return dark ? [solidDark, solidDark] : ['rgba(255,255,255,1)', 'rgba(255,255,255,1)'];
  if (dark) {
    return [`rgba(255,255,255,${(0.2 - 0.12 * amount).toFixed(3)})`, `rgba(255,255,255,${(0.09 - 0.06 * amount).toFixed(3)})`];
  }
  const topA = Math.max(0.22, 1 - 0.8 * amount);
  const u = clamp01(amount / 0.65); // el tinte lila llega a su máximo en el valor por defecto
  const rgb = [0, 1, 2].map((i) => Math.round(lerp(255, LILAC[i], u)));
  const botA = Math.max(0.1, (1 - amount) ** 1.5);
  return [`rgba(255,255,255,${topA.toFixed(3)})`, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${botA.toFixed(3)})`];
}

export const blurWeb = (amount: number) => `blur(${Math.round(18 + 10 * amount)}px) saturate(${Math.round(160 + 40 * amount)}%)`;

// Relleno de la barra de abajo cuando el sistema no da vidrio líquido.
export function barFill(amount: number, dark: boolean, platform: 'ios' | 'android' | 'web'): string {
  if (!glassOn(amount)) return dark ? '#221933' : '#fff';
  if (dark) {
    const a = platform === 'android' ? lerp(0.97, 0.82, amount) : platform === 'web' ? lerp(0.9, 0.66, amount) : lerp(0.85, 0.6, amount);
    return `rgba(34,25,51,${a.toFixed(3)})`;
  }
  const a = platform === 'android' ? lerp(0.97, 0.8, amount) : platform === 'web' ? 0.96 - 0.7 * amount : lerp(0.9, 0.45, amount);
  const u = clamp01(amount / 0.65);
  const rgb = [255 - (255 - 206) * u, 255 - (255 - 186) * u, 255].map(Math.round);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(3)})`;
}
