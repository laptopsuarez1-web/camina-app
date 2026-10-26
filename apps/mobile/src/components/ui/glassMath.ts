// Cuentas del vidrio, compartidas por las tarjetas (Glass) y la barra de abajo.
// amount: 0 = sólido, 1 = cristal. El valor por defecto (0,65) es el vidrio lila.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const LILAC = [167, 139, 250] as const;
type Rgb = readonly [number, number, number];

export const glassOn = (amount: number) => amount > 0.04;

// Tramo "cristal": 0 hasta el valor por defecto (0,65) y 1 con el deslizador al máximo. Todo lo que hace que el extremo
// Cristal se vea de vidrio (menos velo blanco, colores detrás, más brillo en el borde) crece con esto, así el vidrio lila
// por defecto queda igual.
export const crystal = (amount: number) => clamp01((amount - 0.65) / 0.35);

// Relleno de una tarjeta: [arriba, abajo].
export function cardFill(amount: number, dark: boolean, solidDark: string, tint: Rgb = LILAC): [string, string] {
  if (!glassOn(amount)) return dark ? [solidDark, solidDark] : ['rgba(255,255,255,1)', 'rgba(255,255,255,1)'];
  if (dark) {
    return [`rgba(255,255,255,${(0.2 - 0.12 * amount).toFixed(3)})`, `rgba(255,255,255,${(0.09 - 0.06 * amount).toFixed(3)})`];
  }
  // Hasta el valor por defecto el velo baja de 1 a 0,48; en el tramo cristal sigue bajando hasta 0,12 para que se vea lo de atrás.
  const topA = lerp(Math.max(0.22, 1 - 0.8 * amount), 0.12, crystal(amount));
  const u = clamp01(amount / 0.65); // el tinte lila llega a su máximo en el valor por defecto
  const rgb = [0, 1, 2].map((i) => Math.round(lerp(255, tint[i], u)));
  const botA = lerp(Math.max(0.1, (1 - amount) ** 1.5), 0.05, crystal(amount));
  return [`rgba(255,255,255,${topA.toFixed(3)})`, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${botA.toFixed(3)})`];
}

// En el tramo cristal el desenfoque baja (vidrio más claro, se distinguen los colores de atrás) y la saturación sube.
export const blurWeb = (amount: number) =>
  `blur(${Math.round(18 + 10 * amount - 12 * crystal(amount))}px) saturate(${Math.round(160 + 40 * amount + 40 * crystal(amount))}%)`;

// Relleno de la barra de abajo cuando el sistema no da vidrio líquido.
export function barFill(amount: number, dark: boolean, platform: 'ios' | 'android' | 'web', tint: Rgb = LILAC): string {
  if (!glassOn(amount)) return dark ? '#221933' : '#fff';
  if (dark) {
    const a = platform === 'android' ? lerp(0.97, 0.82, amount) : platform === 'web' ? lerp(0.9, 0.66, amount) : lerp(0.85, 0.6, amount);
    return `rgba(34,25,51,${a.toFixed(3)})`;
  }
  // Velo mínimo: con Cristal al máximo la barra no baja de 0,5 de opacidad (el valor del vidrio por defecto), para que la etiqueta
  // se lea sobre una tarjeta de color (medido: con 0,26 la etiqueta "Canjes" daba 2,85:1).
  const a = platform === 'android' ? lerp(0.97, 0.8, amount) : Math.max(0.5, platform === 'web' ? 0.96 - 0.7 * amount : lerp(0.9, 0.45, amount));
  const u = clamp01(amount / 0.65);
  const rgb = [0, 1, 2].map((i) => Math.round(255 - (255 - tint[i]) * 0.58 * u));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(3)})`;
}
