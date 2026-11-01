// Sentry de mentira: las pruebas no mandan nada.
export const monitoringEnabled = false;
export const Sentry = { addBreadcrumb() {}, captureMessage() {}, captureException() {}, setUser() {} };
export function setMonitoringUser() {}
