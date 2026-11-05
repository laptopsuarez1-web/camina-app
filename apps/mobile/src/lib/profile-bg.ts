import { colors } from '@/theme/tokens';

// Fondos del perfil (banner de arriba). Se guarda la clave en profiles.profile_bg (migración 0079); null = Violeta, el de siempre.
// El dibujo de cada uno está en components/profile/ProfileBanner.tsx.
// Las claves son las de siempre (así no hace falta migrar); cambió el dibujo y el nombre de cada una.
export const PROFILE_BGS = [
  { key: 'violeta', label: 'Camina', colors: colors.headerGradient },
  { key: 'bosque', label: 'Viñedos de Tarija', colors: ['#4a2a8a', '#b5487a', '#f39a5b'] as const },
  { key: 'ciudad', label: 'Illimani de noche', colors: ['#1f1a5e', '#120d38', '#07051a'] as const },
  { key: 'sendero', label: 'Salar de Uyuni', colors: ['#3b2577', '#9a4a9a', '#f3a57a'] as const },
  { key: 'pista', label: 'Lago Titicaca', colors: ['#2b2a7a', '#6a4aa8', '#e08a72'] as const },
  { key: 'cielo', label: 'Valle de la Luna', colors: ['#2a1650', '#1a0e38', '#0b0620'] as const },
] as const;

export type ProfileBgKey = (typeof PROFILE_BGS)[number]['key'];

export function profileBg(key: string | null | undefined) {
  return PROFILE_BGS.find((b) => b.key === key) ?? PROFILE_BGS[0];
}
