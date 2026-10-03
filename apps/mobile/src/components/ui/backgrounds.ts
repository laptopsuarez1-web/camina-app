// Fondo de la app (Perlado): casi blanco con reflejos de nácar; en oscuro, grafito con los mismos reflejos apagados.
// Es un degradé de base más "luces" radiales muy suaves (no manchas):
// el vidrio de las tarjetas necesita color que varíe de un punto a otro para que se note el desenfoque.
// glows: x, y y r van de 0 a 1 sobre la pantalla (r es el radio); c es el color y a la opacidad en el centro.

export type Glow = { x: number; y: number; r: number; c: string; a: number };
export type BackgroundPalette = {
  base: readonly [string, string, ...string[]];
  end?: { x: number; y: number };
  glows: Glow[];
  /** Lila con el que se tiñe el vidrio de las tarjetas en modo claro (R, G, B). */
  tint?: readonly [number, number, number];
};

const LIGHT: BackgroundPalette = {
  base: ['#FCFBFF', '#F6F2FB', '#F1EDF8'],
  end: { x: 0.6, y: 1 },
  glows: [
    { x: 0.1, y: 0.1, r: 0.6, c: '#FFD3EA', a: 0.75 },
    { x: 0.95, y: 0.25, r: 0.55, c: '#CFF3E5', a: 0.8 },
    { x: 0.15, y: 0.62, r: 0.55, c: '#D2E4FF', a: 0.85 },
    { x: 0.9, y: 0.82, r: 0.6, c: '#E4D6FF', a: 0.85 },
    { x: 0.5, y: 0.45, r: 0.4, c: '#FFE8D0', a: 0.5 },
  ],
  tint: [215, 205, 245],
};

const DARK: BackgroundPalette = {
  base: ['#15141B', '#1A1822', '#201C2B'],
  end: { x: 0.6, y: 1 },
  glows: [
    { x: 0.1, y: 0.1, r: 0.6, c: '#8A4B78', a: 0.3 },
    { x: 0.95, y: 0.25, r: 0.55, c: '#2F7A6E', a: 0.3 },
    { x: 0.15, y: 0.62, r: 0.55, c: '#3B57A0', a: 0.3 },
    { x: 0.9, y: 0.82, r: 0.6, c: '#6A4BB0', a: 0.34 },
  ],
};

export const paletteFor = (dark: boolean): BackgroundPalette => (dark ? DARK : LIGHT);
