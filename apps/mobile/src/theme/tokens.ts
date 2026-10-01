// Espejo en JS de tailwind.config.js — para lugares que necesitan el valor hex
// crudo (stroke de SVG, react-native-maps, etc.) en vez de una clase Tailwind.
export const colors = {
  light: {
    bg: '#F7F3FC',
    card: '#FFFFFF',
    line: '#E1D2F5',
    muted: '#6E5C8F',
    text: '#291C47',
    aquaLight: '#E3F5F0',
    purpleLight: '#F1EBFA',
  },
  dark: {
    bg: '#16101F',
    card: '#221933',
    line: '#3A2C52',
    muted: '#B3A6D6',
    text: '#F0EBFA',
    aquaLight: '#1C3A34',
    purpleLight: '#2E2247',
  },
  aqua: '#4FC3A8',
  // Para texto y fondos de botón con texto blanco (5.2:1); el aqua queda para íconos, barras y decoración.
  aquaDeep: '#1F7A66',
  purple: '#8B4FD1',
  warn: '#F2985C',
  warnDeep: '#A34F14',
  warnLight: '#FDEEE2',
  authBg: '#241748',
  authBgSoft: '#2F1E5C',
  authMuted: '#C4B8E8',
  mint: '#7FEDC4',
  mintDark: '#12281F',
} as const;

export const categoryPalette: Record<string, [string, string, string]> = {
  Café: ['#E3F5F0', '#D8EFE8', '#4FC3A8'],
  Gastronomía: ['#FBEAE0', '#F5D9C6', '#F2985C'],
  Entretenimiento: ['#F1EBFA', '#E4D6F5', '#8B4FD1'],
  Fitness: ['#E3F5F0', '#CDEEE3', '#4FC3A8'],
  Belleza: ['#FDECF2', '#F9D7E4', '#D4537E'],
};
