import { colors } from '@/theme/tokens';

// Fondos del perfil (banner de arriba). Se guarda la clave en profiles.profile_bg (migración 0079); null = Violeta, el de siempre.
// El dibujo de cada uno está en components/profile/ProfileBanner.tsx.
// El degradé de la app en morado (el de siempre) y el mismo estilo en el verde de Camina.
// Las claves viejas que ya no están (ciudad, sendero, pista, cielo) se ven en Morado.
export const PROFILE_BGS = [
  { key: 'violeta', label: 'Morado', colors: colors.headerGradient },
  { key: 'bosque', label: 'Verde', colors: ['#1a6e57', '#10281f', '#120a1e'] as const },
] as const;

export type ProfileBgKey = (typeof PROFILE_BGS)[number]['key'];

export function profileBg(key: string | null | undefined) {
  return PROFILE_BGS.find((b) => b.key === key) ?? PROFILE_BGS[0];
}
