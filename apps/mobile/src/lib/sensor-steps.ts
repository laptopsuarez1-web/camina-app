import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import StepCounter from '../../modules/step-counter';
import { boliviaDay, boliviaStartOfDay } from '@/lib/bolivia';
import { applyReading, EMPTY_SENSOR_STATE, type SensorState } from '@/lib/sensor-steps-math';

// Pasos con el contador del propio teléfono (solo Android). Sirve cuando Health Connect está vacío porque ninguna app
// (Google Fit, Samsung Health...) le escribe pasos: el contador funciona siempre y nadie lo edita a mano.
// En iPhone, en la web o en versiones de la app sin el módulo nativo, todo esto devuelve 'unavailable' / null.
export type SensorStatus = 'unavailable' | 'needs-permission' | 'active';

const KEY = 'camina_sensor_steps_v1';
const READ_TIMEOUT_MS = 4000;
const FNS = { dayOf: (ms: number) => boliviaDay(new Date(ms)), startOfDay: (ms: number) => boliviaStartOfDay(new Date(ms)).getTime() };

function supported(): boolean {
  if (Platform.OS !== 'android' || !StepCounter) return false;
  try {
    return StepCounter.isAvailable();
  } catch {
    return false;
  }
}

export async function sensorStatus(): Promise<SensorStatus> {
  if (!supported()) return 'unavailable';
  const perm = await Pedometer.getPermissionsAsync().catch(() => null);
  return perm?.granted ? 'active' : 'needs-permission';
}

// Pide el permiso de «Actividad física». Devuelve true si quedó dado.
export async function requestSensorPermission(): Promise<boolean> {
  if (!supported()) return false;
  const perm = await Pedometer.requestPermissionsAsync().catch(() => null);
  return !!perm?.granted;
}

// Programa la lectura periódica nativa (versiones de la app sin ella: no hace nada).
let scheduled = false;
function scheduleBackgroundReadings(): void {
  if (scheduled) return;
  try {
    if (typeof StepCounter?.scheduleBackground === 'function') scheduled = StepCounter.scheduleBackground();
  } catch {
    // sin segundo plano: se sigue con las lecturas al abrir
  }
}

function drainBackgroundReadings(): { at: number; count: number; bootMs: number }[] {
  try {
    if (typeof StepCounter?.drainReadings !== 'function') return [];
    return StepCounter.drainReadings().filter((r) => Number.isFinite(r.at) && Number.isFinite(r.count) && r.count >= 0);
  } catch {
    return [];
  }
}

// Las lecturas van de a una: si dos se cruzaran, las dos partirían del mismo dato guardado y se perderían pasos.
let queue: Promise<unknown> = Promise.resolve();

// Lee el contador, anota la lectura y devuelve los pasos del día pedido. null si el contador no se puede usar.
export function readSensorDaySteps(day: Date): Promise<number | null> {
  const run = async (): Promise<number | null> => {
    if ((await sensorStatus()) !== 'active') return null;
    scheduleBackgroundReadings();
    const reading = await StepCounter!.readAsync(READ_TIMEOUT_MS).catch(() => null);
    let state: SensorState = EMPTY_SENSOR_STATE;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) state = { ...EMPTY_SENSOR_STATE, ...(JSON.parse(raw) as SensorState) };
    } catch {
      // dato guardado roto: se empieza de nuevo
    }
    // Lecturas anotadas con la app cerrada (si el teléfono las entrega): se aplican en orden con su propia hora,
    // con los mismos topes de siempre. Así el día se reparte con la medianoche real y no a ojo.
    let changed = false;
    for (const r of drainBackgroundReadings()) {
      if (state.at != null && r.at <= state.at) continue;
      state = applyReading(state, { count: r.count, bootMs: r.bootMs }, r.at, FNS);
      changed = true;
    }
    if (reading) {
      state = applyReading(state, reading, Date.now(), FNS);
      changed = true;
    }
    // Las lecturas ya se borraron del teléfono: se guardan siempre, aunque la lectura de ahora haya fallado.
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    return state.days[boliviaDay(day)] ?? 0;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => null);
  return p.catch(() => null);
}
