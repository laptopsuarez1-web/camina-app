import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT, POINTS_TTL_DAYS } from '@/constants/business-rules';

export const ONBOARDING_SEEN_KEY = 'camina_onboarding_seen';

// Se muestra una sola vez, en la primera instalación (ver app/index.tsx).
// Cada pantalla muestra una captura real de la app (ver app/onboarding.tsx). Textos en español neutro, sin voseo.
export const ONBOARDING = [
  {
    art: 'ring',
    title: 'Cada paso cuenta',
    desc: 'Camina cuenta tus pasos con el teléfono en el bolsillo. Abre la app cada día para que esos pasos sumen Puntos.',
  },
  {
    art: 'points',
    title: 'Tus pasos se vuelven Puntos',
    desc: `Cada ${POINTS_PER_STEP_UNIT.toLocaleString('es-BO')} pasos ganas 1 Punto, hasta ${DAILY_POINTS_CAP} por día. Los Puntos duran ${POINTS_TTL_DAYS} días: conviene caminar seguido.`,
  },
  {
    art: 'reward',
    title: 'Canjéalos cerca de ti',
    desc: 'Locales de tu ciudad te dan premios a cambio de tus Puntos: descuentos y cosas gratis.',
  },
  {
    art: 'group',
    title: 'Mejor en grupo',
    desc: 'Arma un grupo con amigos, pónganse una meta semanal y vean quién camina más.',
  },
] as const;
