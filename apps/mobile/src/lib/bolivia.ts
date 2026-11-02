// Camina funciona con la hora de Bolivia (America/La_Paz, UTC-4, sin horario de verano), igual que
// el servidor (local_today()). Si el celular está en otra zona (viaje, pruebas desde Argentina),
// el "día" de pasos, la semana del ranking y el reinicio deben seguir siendo los de Bolivia.
export const BOLIVIA_OFFSET_MS = -4 * 3600_000;

// "2026-11-01" del día en Bolivia de ese instante.
export function boliviaDay(d: Date = new Date()): string {
  return new Date(d.getTime() + BOLIVIA_OFFSET_MS).toISOString().slice(0, 10);
}

// Medianoche del día de Bolivia como instante real (para pedir pasos a Salud / filtrar en la base).
export function boliviaStartOfDay(d: Date = new Date()): Date {
  const [y, m, day] = boliviaDay(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 4, 0, 0, 0));
}

// Fecha "de calendario" de hoy en Bolivia, a medianoche en la zona del celular. Sirve para hacer
// cuentas de días y semanas con setDate/getDay sin que la zona del celular cambie el día.
export function boliviaToday(d: Date = new Date()): Date {
  const [y, m, day] = boliviaDay(d).split('-').map(Number);
  return new Date(y, m - 1, day);
}

// Hora del reloj en Bolivia (0-23).
export function boliviaHour(d: Date = new Date()): number {
  return new Date(d.getTime() + BOLIVIA_OFFSET_MS).getUTCHours();
}
