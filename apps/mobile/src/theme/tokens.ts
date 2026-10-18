// Espejo en JS de tailwind.config.js — para lugares que necesitan el valor hex
// crudo (stroke de SVG, react-native-maps, etc.) en vez de una clase Tailwind.
export const colors = {
  light: {
    bg: '#F7F3FC',
    card: '#FFFFFF',
    line: '#E1D2F5',
    // Texto secundario: 4,5:1 o más también sobre el vidrio lila del fondo Perlado.
    muted: '#655483',
    text: '#291C47',
    aquaLight: '#E3F5F0',
    purpleLight: '#F1EBFA',
  },
  dark: {
    bg: '#16101F',
    card: '#221933',
    line: '#3A2C52',
    muted: '#B9AED9',
    text: '#F0EBFA',
    aquaLight: '#1C3A34',
    purpleLight: '#2E2247',
  },
  aqua: '#4FC3A8',
  // Para fondos de botón con texto blanco (5,2:1). Como color de texto sobre el vidrio no llega a 4,5:1: ahí va aquaInk.
  aquaDeep: '#1F7A66',
  // Verde para TEXTO en modo claro (en oscuro el texto verde es mint).
  aquaInk: '#1A6555',
  // Ícono verde suelto sobre superficie clara (3:1); el aqua queda para barras y decoración.
  aquaIcon: '#3B927E',
  purple: '#8B4FD1',
  // Morado para TEXTO en claro (4,5:1 sobre el vidrio) y su par para oscuro.
  purpleInk: '#8149C2',
  purpleSoft: '#C9ADF5',
  // Morado oscuro para botones y filtros con texto blanco, parejo con el verde oscuro (aquaDeep).
  purpleDeep: '#5B31A3',
  warn: '#F2985C',
  // Naranja para TEXTO en claro (4,5:1) y su par para oscuro.
  warnDeep: '#9A4A13',
  warnSoft: '#FFB27A',
  warnLight: '#FDEEE2',
  // Rojo de error/peligro: texto en claro y en oscuro, y relleno con texto blanco (4,7:1).
  dangerInk: '#C0262B',
  dangerSoft: '#FF8388',
  dangerFill: '#CF3F44',
  authBg: '#241748',
  authBgSoft: '#2F1E5C',
  authMuted: '#C4B8E8',
  mint: '#7FEDC4',
  // Degradé oscuro de las cabeceras (Inicio, Grupos, onboarding, bienvenida): una sola materia para todas.
  headerGradient: ['#3a2668', '#1c1030', '#120a1e'] as const,
  mintDark: '#12281F',
  // Texto e íconos sobre un chip mint (4,8:1).
  mintInk: '#156650',
  // Ámbar para TEXTO sobre los avisos de fondo ámbar claro (4,8:1).
  goldInk: '#8F6307',
} as const;
