import * as Sentry from '@sentry/react-native';

// Monitoreo de errores. Solo se activa si hay un DSN configurado
// (EXPO_PUBLIC_SENTRY_DSN, como variable de entorno de EAS); sin DSN no hace nada.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!dsn;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

export function setMonitoringUser(id: string | null) {
  if (!dsn) return;
  Sentry.setUser(id ? { id } : null);
}

export { Sentry };
