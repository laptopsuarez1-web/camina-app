// Fondo de la app (Olas): casi blanco perlado con tres olas suaves al pie, menta, lila y verde de la marca.
// En oscuro, grafito con las mismas olas apagadas. Las olas son formas planas (sin luces radiales, salvo las manchas del tramo Cristal): el vidrio de las
// tarjetas y de la barra las desenfoca al pasar por encima, y arriba el fondo queda limpio.
// Las curvas van en un lienzo de 390x844 anclado abajo; "c" es el color y "a" la opacidad arriba/abajo de cada ola.

export type Wave = { d: string; c: string; a: readonly [number, number] };
export type BackgroundPalette = {
  base: readonly [string, string, ...string[]];
  end?: { x: number; y: number };
  waves: Wave[];
  /** Manchas de color que aparecen solo con el vidrio en el tramo Cristal: sin algo de color detrás, una tarjeta
   *  transparente sobre el fondo casi blanco se ve igual que una sólida. cx/cy/r en el lienzo de las olas. */
  aura: { cx: number; cy: number; r: number; c: string; a: number }[];
  /** Lila con el que se tiñe el vidrio de las tarjetas en modo claro (R, G, B). */
  tint?: readonly [number, number, number];
};

/** Lienzo en el que están dibujadas las olas. */
export const WAVES_VIEWBOX = { w: 390, h: 844 } as const;

const WAVE_PATHS = [
  'M0 600C70 565 140 640 225 610S340 560 390 585V844H0Z',
  'M0 670C85 632 160 712 250 682S352 642 390 662V844H0Z',
  'M0 740C100 710 170 780 265 752S355 722 390 738V844H0Z',
] as const;

const LIGHT: BackgroundPalette = {
  base: ['#FCFBFF', '#F8F6FC', '#F5F3FB'],
  end: { x: 0, y: 1 },
  waves: [
    { d: WAVE_PATHS[0], c: '#7FDCBF', a: [0.14, 0.06] },
    { d: WAVE_PATHS[1], c: '#A98BE8', a: [0.14, 0.06] },
    { d: WAVE_PATHS[2], c: '#4FC3A8', a: [0.14, 0.08] },
  ],
  aura: [
    { cx: 340, cy: 120, r: 260, c: '#B79CF2', a: 0.6 },
    { cx: 30, cy: 420, r: 250, c: '#7FDCBF', a: 0.55 },
    { cx: 360, cy: 640, r: 230, c: '#C9A8F5', a: 0.5 },
  ],
  tint: [215, 205, 245],
};

const DARK: BackgroundPalette = {
  base: ['#15141B', '#1A1822', '#201C2B'],
  end: { x: 0.6, y: 1 },
  waves: [
    { d: WAVE_PATHS[0], c: '#2F7A6E', a: [0.32, 0.10] },
    { d: WAVE_PATHS[1], c: '#6A4BB0', a: [0.34, 0.10] },
    { d: WAVE_PATHS[2], c: '#2F7A6E', a: [0.36, 0.14] },
  ],
  aura: [
    { cx: 340, cy: 120, r: 260, c: '#7A55D0', a: 0.42 },
    { cx: 30, cy: 420, r: 250, c: '#2F9A86', a: 0.36 },
    { cx: 360, cy: 640, r: 230, c: '#7A55D0', a: 0.34 },
  ],
};

export const paletteFor = (dark: boolean): BackgroundPalette => (dark ? DARK : LIGHT);
