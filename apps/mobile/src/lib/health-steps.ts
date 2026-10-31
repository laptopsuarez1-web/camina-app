import { Platform } from 'react-native';
import {
  queryStatisticsForQuantity,
  queryQuantitySamples,
} from '@kingstinct/react-native-healthkit';
import { aggregateRecord, readRecords } from 'react-native-health-connect';
import { Pedometer } from 'expo-sensors';

// Lectura de pasos de un rango en la fuente real del teléfono (Salud en iPhone, Health Connect en Android),
// descontando los pasos cargados a mano (antifraude). Lo usan Inicio (cada 15 s) y la sincronización al abrir la app (hoy y ayer); no hay sincronización en segundo plano.
// Se asume que la persona ya dio el permiso; si no, la lectura devuelve 0 o falla.
export const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount';
// Health Connect: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY
const HC_MANUAL_ENTRY = 3;

export function startOfDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function dayISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function readHealthKitSteps(startDate: Date, endDate: Date): Promise<number> {
  const filter = { date: { startDate, endDate } };
  const stats = await queryStatisticsForQuantity(STEP_COUNT_IDENTIFIER, ['cumulativeSum'], { filter, unit: 'count' });
  // Antifraude: los pasos cargados a mano en Salud (HKWasUserEntered) no suman.
  const samples = await queryQuantitySamples(STEP_COUNT_IDENTIFIER, { filter, unit: 'count', limit: 0 });
  const manual = samples
    .filter((s) => s.metadata?.HKWasUserEntered === true)
    .reduce((acc, s) => acc + s.quantity, 0);
  return Math.max(0, Math.round((stats.sumQuantity?.quantity ?? 0) - manual));
}

export async function readHealthConnectSteps(startDate: Date, endDate: Date): Promise<number> {
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  };
  const result = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
  // Antifraude: los pasos cargados a mano en Health Connect no suman.
  let manual = 0;
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Steps', { timeRangeFilter, pageSize: 500, pageToken });
    for (const r of page.records) {
      if (r.metadata?.recordingMethod === HC_MANUAL_ENTRY) manual += r.count;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return Math.max(0, (result.COUNT_TOTAL ?? 0) - manual);
}

// Pasos de un día completo (hoy llega hasta ahora). null si no hay fuente de pasos en esta plataforma.
export async function readDaySteps(day: Date): Promise<number | null> {
  const start = startOfDay(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const to = end.getTime() > Date.now() ? new Date() : end;
  if (Platform.OS === 'ios') {
    // Igual que en Inicio: Salud manda, y el sensor del teléfono cubre a quien no dio el permiso de Pasos.
    const health = await readHealthKitSteps(start, to).catch(() => 0);
    const sensor = await Pedometer.getStepCountAsync(start, to).then((r) => r.steps).catch(() => 0);
    return Math.max(health, sensor);
  }
  if (Platform.OS === 'android') return readHealthConnectSteps(start, to);
  return null;
}
