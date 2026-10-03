// Fondos de la app. Cada uno es un degradé de base más "luces" radiales muy suaves (no manchas):
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
export type BackgroundDef = { id: string; name: string; hint: string; light: BackgroundPalette; dark: BackgroundPalette };

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'perla',
    name: 'Perlado',
    hint: 'Casi blanco con reflejos de nácar',
    light: {
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
    },
    dark: {
      base: ['#15141B', '#1A1822', '#201C2B'],
      end: { x: 0.6, y: 1 },
      glows: [
        { x: 0.1, y: 0.1, r: 0.6, c: '#8A4B78', a: 0.3 },
        { x: 0.95, y: 0.25, r: 0.55, c: '#2F7A6E', a: 0.3 },
        { x: 0.15, y: 0.62, r: 0.55, c: '#3B57A0', a: 0.3 },
        { x: 0.9, y: 0.82, r: 0.6, c: '#6A4BB0', a: 0.34 },
      ],
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    hint: 'Degradé de menta, azul y violeta',
    light: {
      base: ['#E9F8F3', '#ECEEFF', '#F5ECFC'],
      end: { x: 0.9, y: 1 },
      glows: [
        { x: 0.1, y: 0.04, r: 0.75, c: '#8FE8D0', a: 0.5 },
        { x: 0.95, y: 0.28, r: 0.7, c: '#AFCFFF', a: 0.45 },
        { x: 0.55, y: 0.62, r: 0.6, c: '#C4AEFF', a: 0.4 },
        { x: 0.1, y: 0.98, r: 0.7, c: '#FFC4E1', a: 0.4 },
      ],
      tint: [190, 175, 250],
    },
    dark: {
      base: ['#0A1620', '#141338', '#1F0F3F'],
      end: { x: 0.9, y: 1 },
      glows: [
        { x: 0.1, y: 0.04, r: 0.7, c: '#1FD1A5', a: 0.26 },
        { x: 0.95, y: 0.3, r: 0.7, c: '#2D6BFF', a: 0.22 },
        { x: 0.5, y: 0.65, r: 0.6, c: '#7A4BFF', a: 0.3 },
        { x: 0.1, y: 1, r: 0.7, c: '#D13FA0', a: 0.2 },
      ],
    },
  },
  {
    id: 'malla',
    name: 'Malla suave',
    hint: 'Cinco colores pastel que se funden',
    light: {
      base: ['#F4F0FF', '#F4F0FF'],
      glows: [
        { x: 0.05, y: 0.02, r: 0.6, c: '#C9F5E6', a: 0.9 },
        { x: 0.98, y: 0.12, r: 0.55, c: '#FFDECF', a: 0.85 },
        { x: 0.3, y: 0.45, r: 0.5, c: '#D9CCFF', a: 0.85 },
        { x: 0.95, y: 0.62, r: 0.55, c: '#CBE3FF', a: 0.9 },
        { x: 0.12, y: 0.95, r: 0.6, c: '#FFD3EA', a: 0.85 },
        { x: 0.85, y: 1, r: 0.5, c: '#E0D2FF', a: 0.85 },
      ],
      tint: [200, 185, 250],
    },
    dark: {
      base: ['#110D22', '#110D22'],
      glows: [
        { x: 0.05, y: 0.02, r: 0.6, c: '#0E7F78', a: 0.5 },
        { x: 0.98, y: 0.12, r: 0.55, c: '#8C3A62', a: 0.42 },
        { x: 0.3, y: 0.45, r: 0.5, c: '#4B2C9E', a: 0.55 },
        { x: 0.95, y: 0.62, r: 0.55, c: '#1F4AA8', a: 0.45 },
        { x: 0.12, y: 0.95, r: 0.6, c: '#8E2C7A', a: 0.4 },
        { x: 0.85, y: 1, r: 0.5, c: '#5B31A3', a: 0.5 },
      ],
    },
  },
  {
    id: 'luz',
    name: 'Lavanda con luz',
    hint: 'Lavanda con una luz que entra desde arriba',
    light: {
      base: ['#F6F1FF', '#EADFFD', '#DCCCF9'],
      end: { x: 0.35, y: 1 },
      glows: [
        { x: 0.5, y: -0.02, r: 0.85, c: '#FFFFFF', a: 0.95 },
        { x: 0.5, y: 0.05, r: 0.45, c: '#FFE9F6', a: 0.7 },
        { x: 0.9, y: 0.95, r: 0.7, c: '#C9B2FF', a: 0.4 },
        { x: 0.05, y: 0.8, r: 0.6, c: '#EBC8FF', a: 0.35 },
      ],
      tint: [175, 150, 245],
    },
    dark: {
      base: ['#1A1235', '#271A52', '#3A2477'],
      end: { x: 0.35, y: 1 },
      glows: [
        { x: 0.5, y: -0.02, r: 0.85, c: '#9B7BFF', a: 0.3 },
        { x: 0.5, y: 0.05, r: 0.4, c: '#F2D9FF', a: 0.08 },
        { x: 0.9, y: 0.95, r: 0.7, c: '#7A4BFF', a: 0.26 },
      ],
    },
  },
  {
    id: 'noche',
    name: 'Noche profunda',
    hint: 'Índigo oscuro con luces cian y violeta',
    light: {
      base: ['#E6EAFF', '#D9DDFA', '#CCCBF5'],
      end: { x: 0.7, y: 1 },
      glows: [
        { x: 0.12, y: 0.06, r: 0.7, c: '#B2EDF7', a: 0.6 },
        { x: 0.92, y: 0.38, r: 0.7, c: '#9CAEFF', a: 0.45 },
        { x: 0.3, y: 0.95, r: 0.75, c: '#C6A9FF', a: 0.45 },
      ],
      tint: [160, 160, 245],
    },
    dark: {
      base: ['#060917', '#0C1030', '#150A33'],
      end: { x: 0.7, y: 1 },
      glows: [
        { x: 0.12, y: 0.06, r: 0.65, c: '#1EC8D0', a: 0.22 },
        { x: 0.92, y: 0.38, r: 0.7, c: '#4B3BFF', a: 0.34 },
        { x: 0.3, y: 0.95, r: 0.75, c: '#A02BD8', a: 0.28 },
      ],
    },
  },
];

export const DEFAULT_BACKGROUND = 'perla';

export function paletteFor(id: string, dark: boolean): BackgroundPalette {
  const def = BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS.find((b) => b.id === DEFAULT_BACKGROUND)!;
  return dark ? def.dark : def.light;
}
