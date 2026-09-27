// Logos reales de comercios ya adheridos, empaquetados en la app (no en
// Storage todavía — no hay panel de comercios real con upload propio para
// esto). Cuando eso exista, esto se reemplaza por `business.logo_url`.
export const BUSINESS_LOGOS: Record<string, ReturnType<typeof require>> = {
  Bloom: require('@/../assets/bloom-logo.png'),
};
