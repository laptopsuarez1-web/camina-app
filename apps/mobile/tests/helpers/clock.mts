// Reloj y zona horaria controlados para las pruebas de fechas.
//   await atTime('2026-10-03T01:30:00Z', 'America/La_Paz', () => { ... })
// Fija "ahora" (Date) y la zona horaria del proceso mientras corre la función, y los restaura al terminar.
import { mock } from 'node:test';

export async function atTime<T>(iso: string, tz: string, fn: () => T | Promise<T>): Promise<T> {
  const previousTz = process.env.TZ;
  process.env.TZ = tz;
  mock.timers.enable({ apis: ['Date'], now: new Date(iso) });
  try {
    return await fn();
  } finally {
    mock.timers.reset();
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  }
}
