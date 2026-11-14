// Récord personal: el día con más pasos de la persona. Cuenta solo días anteriores a hoy guardados en el servidor.
// Se festeja cuando hoy supera ese récord, con un mínimo para que no salga con poquitos pasos ni a quien recién empieza.
export const RECORD_MIN_STEPS = 3000;
export const RECORD_MIN_DAYS = 3;

export type RecordStatus = { isRecord: boolean; prevBest: number; prevBestDay: string | null };

export function recordStatus(todaySteps: number, history: { day: string; steps: number }[], todayKey: string): RecordStatus {
  const past = history.filter((d) => d.day < todayKey && d.steps > 0);
  let prevBest = 0;
  let prevBestDay: string | null = null;
  for (const d of past) {
    if (d.steps > prevBest) {
      prevBest = d.steps;
      prevBestDay = d.day;
    }
  }
  const isRecord = past.length >= RECORD_MIN_DAYS && todaySteps >= RECORD_MIN_STEPS && todaySteps > prevBest;
  return { isRecord, prevBest, prevBestDay };
}
