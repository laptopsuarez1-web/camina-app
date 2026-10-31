// Estado de la activación de pasos en Android. Health Connect solo GUARDA pasos: los escribe una app que los cuente
// (Google Fit, Samsung Health, Fitbit...). Por eso hay varios pasos posibles y solo se pide el que falta.
export type AndroidStepsSetup =
  | 'checking'
  | 'needs-system' // Health Connect no está instalado o necesita actualizarse
  | 'needs-permission' // Health Connect listo, falta el permiso de Pasos para Camina
  | 'needs-source' // permiso dado, pero ninguna app está guardando pasos todavía
  | 'active'
  | 'error';

export type SetupProbe = {
  sdk: 'available' | 'unavailable' | 'update-required';
  granted: boolean;
  hasRecentSteps: boolean;
  failed?: boolean;
};

export function resolveAndroidSetup(p: SetupProbe | null): AndroidStepsSetup {
  if (!p) return 'checking';
  if (p.failed) return 'error';
  if (p.sdk !== 'available') return 'needs-system';
  if (!p.granted) return 'needs-permission';
  if (!p.hasRecentSteps) return 'needs-source';
  return 'active';
}

export const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
export const GOOGLE_FIT_PACKAGE = 'com.google.android.apps.fitness';
// Cuántos días atrás se busca algún registro para saber si hay una app guardando pasos.
export const SOURCE_LOOKBACK_DAYS = 7;
