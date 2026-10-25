import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import {
  isHealthDataAvailable,
  requestAuthorization as requestHealthKitAuthorization,
  queryStatisticsForQuantity,
} from '@kingstinct/react-native-healthkit';
import {
  getSdkStatus,
  initialize as initializeHealthConnect,
  requestPermission as requestHealthConnectPermission,
  aggregateGroupByPeriod,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { enableBackgroundSteps } from '@/lib/background-steps';
import { STEP_COUNT_IDENTIFIER, startOfDay, readHealthKitSteps, readHealthConnectSteps } from '@/lib/health-steps';

// Fuente real de pasos: HealthKit en iOS (agrega TODAS las apps/wearables que
// escriben ahí, no solo el sensor del teléfono) y Health Connect en Android
// (mismo rol: unifica Google Fit, relojes, etc.). En iPhone, si Salud no está
// disponible, se cae al sensor del teléfono (expo-sensors Pedometer). En Android
// no hay sensor de respaldo: sin Health Connect no se cuentan pasos.
const POLL_MS = 15_000;
const STEPS_CACHE_KEY = 'camina_steps_cache_v1';

function startOfToday() {
  return startOfDay(new Date());
}

// ---------- HealthKit (iOS) ----------
function useHealthKitSteps(enabled: boolean) {
  const [steps, setSteps] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const readRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;
    let cancelled = false;

    async function readToday() {
      try {
        const value = await readHealthKitSteps(startOfToday(), new Date());
        if (!cancelled) setSteps(value);
      } catch {
        if (!cancelled) setSteps(null);
      }
    }

    readRef.current = readToday;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        if (!isHealthDataAvailable()) {
          if (!cancelled) setReady(false);
          return;
        }
        await requestHealthKitAuthorization({ toRead: [STEP_COUNT_IDENTIFIER] });
        if (cancelled) return;
        setReady(true);
        enableBackgroundSteps();
        await readToday();
        interval = setInterval(readToday, POLL_MS);
      } catch {
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  return { steps, ready, refresh: () => readRef.current() };
}

// ---------- Health Connect (Android) ----------
export type HealthConnectStatus = 'checking' | 'unavailable' | 'denied' | 'error' | 'ok';

function useHealthConnectSteps(enabled: boolean) {
  const [steps, setSteps] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<HealthConnectStatus>('checking');
  const readRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    let cancelled = false;

    async function readToday() {
      try {
        const value = await readHealthConnectSteps(startOfToday(), new Date());
        if (!cancelled) setSteps(value);
      } catch {
        if (!cancelled) setSteps(null);
      }
    }

    readRef.current = readToday;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        const sdkStatus = await getSdkStatus();
        if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
          if (!cancelled) { setReady(false); setStatus('unavailable'); }
          return;
        }
        const initialized = await initializeHealthConnect();
        if (!initialized) {
          if (!cancelled) { setReady(false); setStatus('unavailable'); }
          return;
        }
        const granted = await requestHealthConnectPermission([{ accessType: 'read', recordType: 'Steps' }]);
        if (!granted.some((p) => 'recordType' in p && p.recordType === 'Steps')) {
          if (!cancelled) { setReady(false); setStatus('denied'); }
          return;
        }
        if (cancelled) return;
        setReady(true);
        setStatus('ok');
        enableBackgroundSteps();
        await readToday();
        interval = setInterval(readToday, POLL_MS);
      } catch {
        // Un fallo técnico no es lo mismo que negar el permiso.
        if (!cancelled) { setReady(false); setStatus('error'); }
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  return { steps, ready, status, refresh: () => readRef.current() };
}

// ---------- Fallback iOS: sensor del teléfono (CoreMotion) ----------
function useIosSensorSteps(enabled: boolean) {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function readToday() {
      try {
        const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
        if (!cancelled) setSteps(result.steps);
      } catch {
        // se mantiene el último valor conocido
      }
    }

    readToday();
    const interval = setInterval(readToday, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return steps;
}

export type StepSource = 'healthkit' | 'health-connect' | 'sensor' | null;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useTodaySteps() {
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);
  const [cached, setCached] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    Pedometer.isAvailableAsync()
      .then(setSensorAvailable)
      .catch(() => setSensorAvailable(false));
  }, []);

  // Último valor conocido de hoy: se muestra al instante mientras se lee Salud.
  useEffect(() => {
    AsyncStorage.getItem(STEPS_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as { day: string; steps: number };
        if (parsed.day === todayKey()) setCached(parsed.steps);
      })
      .catch(() => {});
  }, []);

  const healthKit = useHealthKitSteps(Platform.OS === 'ios');
  const healthConnect = useHealthConnectSteps(Platform.OS === 'android');

  // El sensor de CoreMotion (solo iPhone) corre siempre como respaldo: si la persona no le dio a Camina el permiso
  // de leer Pasos en Salud, iOS no avisa y Salud devuelve 0, pero el sensor (permiso "Movimiento y forma física") sí cuenta.
  const iosSensorSteps = useIosSensorSteps(Platform.OS === 'ios' && sensorAvailable === true);

  let result: {
    steps: number;
    available: boolean | null;
    source: StepSource;
    healthConnectStatus: HealthConnectStatus | null;
    live: boolean;
  };
  if (Platform.OS === 'ios') {
    if (healthKit.ready && healthKit.steps != null && healthKit.steps >= iosSensorSteps) {
      result = { steps: healthKit.steps, available: true, source: 'healthkit', healthConnectStatus: null, live: true };
    } else {
      result = { steps: iosSensorSteps, available: sensorAvailable, source: sensorAvailable ? 'sensor' : null, healthConnectStatus: null, live: sensorAvailable === true };
    }
  } else if (healthConnect.ready && healthConnect.steps != null) {
    // Android: los pasos SOLO salen de Health Connect (la fuente oficial de Android),
    // así se pueden descartar los cargados a mano. No hay sensor de respaldo.
    result = { steps: healthConnect.steps, available: true, source: 'health-connect', healthConnectStatus: 'ok', live: true };
  } else {
    result = {
      steps: 0,
      available: healthConnect.status === 'checking' ? null : false,
      source: null,
      healthConnectStatus: healthConnect.status,
      live: false,
    };
  }

  useEffect(() => {
    if (result.live && result.steps > 0) {
      AsyncStorage.setItem(STEPS_CACHE_KEY, JSON.stringify({ day: todayKey(), steps: result.steps })).catch(() => {});
    }
  }, [result.live, result.steps]);

  const refresh = useCallback(async () => {
    await Promise.all([healthKit.refresh(), healthConnect.refresh()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `steps` es lo que se muestra (con el último valor conocido mientras carga);
  // `live` indica si viene de la fuente real — solo eso se manda al servidor.
  return { ...result, steps: result.live ? result.steps : Math.max(result.steps, cached ?? 0), refresh };
}

// ---------- Historial de pasos por día (solo para mostrar en Actividad) ----------
// Salud ya tiene los pasos de los días en que no abriste la app. Se muestran en Actividad pero NO
// suman Puntos: los Puntos solo se cargan con la app abierta (earn_points_from_steps).
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useHealthDailySteps(days = 35) {
  const [byDay, setByDay] = useState<Record<string, number>>({});

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    const start = startOfToday();
    start.setDate(start.getDate() - (days - 1));

    (async () => {
      try {
        const out: Record<string, number> = {};
        if (Platform.OS === 'ios') {
          if (!isHealthDataAvailable()) return;
          const queries = Array.from({ length: days }, (_, i) => {
            const from = new Date(start);
            from.setDate(from.getDate() + i);
            const to = new Date(from);
            to.setDate(to.getDate() + 1);
            return queryStatisticsForQuantity(STEP_COUNT_IDENTIFIER, ['cumulativeSum'], {
              filter: { date: { startDate: from, endDate: to } },
              unit: 'count',
            }).then((r) => {
              out[dayKey(from)] = Math.max(0, Math.round(r.sumQuantity?.quantity ?? 0));
            });
          });
          await Promise.all(queries);
        } else {
          if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return;
          await initializeHealthConnect();
          const groups = await aggregateGroupByPeriod({
            recordType: 'Steps',
            timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: new Date().toISOString() },
            timeRangeSlicer: { period: 'DAYS', length: 1 },
          });
          for (const g of groups) out[dayKey(new Date(g.startTime))] = Math.max(0, Math.round(g.result.COUNT_TOTAL ?? 0));
        }
        if (!cancelled) setByDay(out);
      } catch {
        // Sin permiso o sin Salud: Actividad muestra solo lo que ya guardó la app.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return byDay;
}
