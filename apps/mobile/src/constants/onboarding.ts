import { POINTS_PER_STEP_UNIT, POINTS_TTL_DAYS } from '@/constants/business-rules';

export const ONBOARDING_SEEN_KEY = 'camina_onboarding_seen';

// Se muestra una sola vez, en la primera instalación (ver app/index.tsx).
// Cada pantalla tiene su ilustración armada con piezas reales de la app (ver app/onboarding.tsx).
export const ONBOARDING = [
  {
    art: 'ring',
    title: 'Cada paso cuenta',
    desc: 'Camina cuenta tus pasos solo, con el teléfono en el bolsillo. No tenés que abrir la app para sumar.',
  },
  {
    art: 'points',
    title: 'Tus pasos se vuelven Puntos',
    desc: `Cada ${POINTS_PER_STEP_UNIT.toLocaleString('es-BO')} pasos ganás 1 Punto. Los Puntos duran ${POINTS_TTL_DAYS} días, así que conviene caminar seguido.`,
  },
  {
    art: 'reward',
    title: 'Canjealos cerca tuyo',
    desc: 'Cafés, restaurantes y gimnasios de tu ciudad te dan premios a cambio de tus Puntos.',
  },
  {
    art: 'group',
    title: 'Mejor en grupo',
    desc: 'Armá un grupo con amigos, pónganse una meta semanal y vean quién camina más.',
  },
] as const;
