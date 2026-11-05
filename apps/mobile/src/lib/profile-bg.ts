// Fondos del perfil (banner de arriba). Se guarda la clave en profiles.profile_bg (migración 0079); null = Violeta, el de siempre.
// El dibujo de cada uno está en components/profile/ProfileBanner.tsx.
// Colores sólidos de la marca. Las claves viejas que ya no están (ciudad, sendero, pista, cielo) se ven en Morado.
export const PROFILE_BGS = [
  { key: 'violeta', label: 'Morado', colors: ['#3B2577', '#3B2577'] as const },
  { key: 'bosque', label: 'Verde', colors: ['#1F7A66', '#1F7A66'] as const },
] as const;

export type ProfileBgKey = (typeof PROFILE_BGS)[number]['key'];

export function profileBg(key: string | null | undefined) {
  return PROFILE_BGS.find((b) => b.key === key) ?? PROFILE_BGS[0];
}
