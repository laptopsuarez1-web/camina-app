// Redes de Camina que se muestran en Perfil > Redes sociales.
// Para sumar Facebook o TikTok alcanza con agregar una entrada acá (y su valor en la base, ver claim_social_follow).
export type SocialNetworkId = 'instagram' | 'facebook' | 'tiktok';

export interface SocialNetwork {
  id: SocialNetworkId;
  name: string;
  handle: string;
  url: string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { id: 'instagram', name: 'Instagram', handle: '@caminaapp', url: 'https://www.instagram.com/caminaapp' },
];

// Puntos por seguir a Camina en cada red (una sola vez por red).
export const SOCIAL_FOLLOW_POINTS = 1;

// Web para comercios que se quieren sumar.
export const BUSINESS_SIGNUP_URL = 'https://caminaapp.com/registro';
