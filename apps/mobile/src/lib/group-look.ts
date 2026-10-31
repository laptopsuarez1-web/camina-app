import { colors } from '@/theme/tokens';

// Fondos que puede elegir quien creó el grupo (se guarda la clave en groups.background; la lista de claves está en la migración 0069).
export const GROUP_BACKGROUNDS = [
  { key: 'aqua', label: 'Noche', colors: colors.headerGradient },
  { key: 'sunset', label: 'Atardecer', colors: ['#7a3a6b', '#3d1a45', '#1a0d26'] as const },
  { key: 'night', label: 'Océano', colors: ['#1d4e6b', '#0f2a44', '#0a1626'] as const },
  { key: 'forest', label: 'Bosque', colors: ['#1f6b57', '#0f3a31', '#0a1f1b'] as const },
  { key: 'berry', label: 'Frutilla', colors: ['#8a2f5a', '#4a1a3a', '#220c1b'] as const },
  { key: 'sand', label: 'Arena', colors: ['#8a6a3a', '#4a3a22', '#241c10'] as const },
] as const;

export type GroupBackgroundKey = (typeof GROUP_BACKGROUNDS)[number]['key'];

export function groupGradient(key: string | null | undefined) {
  return (GROUP_BACKGROUNDS.find((b) => b.key === key) ?? GROUP_BACKGROUNDS[0]).colors;
}

// Metas semanales sugeridas para el grupo entero (pasos sumados de todos).
export const GROUP_GOAL_PRESETS = [
  { value: 25000, label: 'Tranquila' },
  { value: 50000, label: 'Constante' },
  { value: 100000, label: 'Activa' },
  { value: 200000, label: 'Reto' },
] as const;
export const GROUP_GOAL_MIN = 5000;
export const GROUP_GOAL_MAX = 5_000_000;
export const GROUP_GOAL_DEFAULT = 50000;
