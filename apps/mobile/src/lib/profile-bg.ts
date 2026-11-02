import { colors } from '@/theme/tokens';

// Fondos del perfil (banner de arriba). Se guarda la clave en profiles.profile_bg (migración 0078); null = Violeta, el de siempre.
// El dibujo de cada uno está en components/profile/ProfileBanner.tsx.
export const PROFILE_BGS = [
  { key: 'violeta', label: 'Violeta', colors: colors.headerGradient },
  { key: 'bosque', label: 'Bosque', colors: ['#0f5a52', '#0a2e2b', '#04171a'] as const },
  { key: 'ciudad', label: 'Ciudad de noche', colors: ['#32207a', '#150d38', '#0a0618'] as const },
  { key: 'sendero', label: 'Sendero al amanecer', colors: ['#5b2a9e', '#c2410c', '#f59e0b'] as const },
  { key: 'pista', label: 'Pista de atletismo', colors: ['#0b2f4f', '#0a1f3a', '#050d1c'] as const },
  { key: 'cielo', label: 'Cielo y nubes', colors: ['#3b3fd0', '#2a2a9a', '#15104a'] as const },
] as const;

export type ProfileBgKey = (typeof PROFILE_BGS)[number]['key'];

export function profileBg(key: string | null | undefined) {
  return PROFILE_BGS.find((b) => b.key === key) ?? PROFILE_BGS[0];
}
