import { colors } from '@/theme/tokens';

// Temas del grupo (se guarda la clave en groups.background; las claves están en el check de la migración 0069).
// Cada tema cambia la cabecera, el color de acento (barra de la meta, botones) y el velo de color del fondo de la pantalla.
export const GROUP_BACKGROUNDS = [
  { key: 'aqua', label: 'Violeta', colors: colors.headerGradient, accent: colors.aqua, accentDeep: colors.aquaDeep, wash: '#8B4FD1' },
  { key: 'forest', label: 'Esmeralda', colors: ['#12896b', '#0b4d3e', '#06241e'] as const, accent: '#5BE0B4', accentDeep: '#0F7A5C', wash: '#12B886' },
  { key: 'night', label: 'Océano', colors: ['#1c6fd1', '#123f7a', '#0a1d3a'] as const, accent: '#6CB6FF', accentDeep: '#1B62B8', wash: '#339AF0' },
  { key: 'sunset', label: 'Atardecer', colors: ['#e8590c', '#a02c4a', '#3a1230'] as const, accent: '#FFB070', accentDeep: '#C2410C', wash: '#FF8A3D' },
  { key: 'berry', label: 'Rosa', colors: ['#d6336c', '#8a1f4e', '#34102a'] as const, accent: '#FF8FBF', accentDeep: '#B02A5B', wash: '#F06595' },
  { key: 'sand', label: 'Dorado', colors: ['#c98a00', '#7a5200', '#2e2005'] as const, accent: '#FFD166', accentDeep: '#8F6200', wash: '#F5B300' },
] as const;

export type GroupBackgroundKey = (typeof GROUP_BACKGROUNDS)[number]['key'];

export function groupTheme(key: string | null | undefined) {
  return GROUP_BACKGROUNDS.find((b) => b.key === key) ?? GROUP_BACKGROUNDS[0];
}
export function groupGradient(key: string | null | undefined) {
  return groupTheme(key).colors;
}
