// Movimiento de los íconos al tocarlos. Funciones puras: se prueban sin pantalla y las usa la animación (worklets).
// `p` es el avance de la animación, de 0 (reposo) a 1 (vuelve al reposo).

export type IconMotion = 'pop' | 'wobble' | 'ring' | 'thud' | 'flick';

// Tiempo total de cada gesto, en milisegundos.
export const MOTION_MS: Record<IconMotion, number> = { pop: 380, wobble: 520, ring: 700, thud: 420, flick: 560 };

type Keys = { at: number[]; scale?: number[]; scaleX?: number[]; rotate?: number[]; y?: number[] };

// Cuadros clave de cada gesto. `at` crece de 0 a 1; los demás arreglos tienen el mismo largo.
export const KEYS: Record<IconMotion, Keys> = {
  pop: { at: [0, 0.2, 0.55, 1], scale: [1, 0.84, 1.12, 1] },
  wobble: { at: [0, 0.25, 0.55, 0.8, 1], rotate: [0, -14, 10, -4, 0], scale: [1, 1.08, 1.08, 1.02, 1] },
  ring: { at: [0, 0.15, 0.3, 0.45, 0.6, 0.78, 1], rotate: [0, 18, -15, 11, -7, 3, 0] },
  thud: { at: [0, 0.25, 0.55, 1], scale: [1, 0.8, 1.12, 1] },
  flick: { at: [0, 0.25, 0.5, 0.75, 1], scale: [1, 1.1, 0.95, 1.07, 1], scaleX: [1, 0.93, 1.05, 0.96, 1], rotate: [0, -3, 2, -2, 0] },
};

// Valor en `p` de una lista de cuadros clave (interpolación lineal; fuera de rango se queda en el extremo).
export function sample(at: number[], values: number[], p: number): number {
  'worklet';
  if (p <= at[0]) return values[0];
  for (let i = 1; i < at.length; i++) {
    if (p <= at[i]) {
      const t = (p - at[i - 1]) / (at[i] - at[i - 1]);
      return values[i - 1] + (values[i] - values[i - 1]) * t;
    }
  }
  return values[values.length - 1];
}

// Avance local de una parte que arranca `delay` ms después y dura `dur` ms, dentro de una animación en `ms`.
export function partProgress(ms: number, delay: number, dur: number): number {
  'worklet';
  const q = (ms - delay) / dur;
  return q < 0 ? 0 : q > 1 ? 1 : q;
}

// Color con transparencia: '#1F7A66' + 0.2 -> '#1F7A6633'. Si no es un hex de 6 dígitos lo devuelve igual.
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
  return `${color}${a}`;
}
