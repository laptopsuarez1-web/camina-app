// Doble de lib/health-steps.ts: sin Salud ni Health Connect. Las pruebas fijan cuántos pasos "lee" el teléfono
// y ven qué días se pidieron.
export const health = {
  steps: 0 as number | null,
  readLog: [] as string[],
};

export function resetHealth() {
  health.steps = 0;
  health.readLog = [];
}

export const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount';

export function dayISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function readDaySteps(day: Date): Promise<number | null> {
  health.readLog.push(dayISO(day));
  return health.steps;
}
