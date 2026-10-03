import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import {
  isHealthDataAvailable,
  requestAuthorization as requestHealthKitAuthorization,
  queryStatisticsForQuantity,
  queryQuantitySamples,
} from '@kingstinct/react-native-healthkit';
import {
  getSdkStatus,
  initialize as initializeHealthConnect,
  requestPermission as requestHealthConnectPermission,
  aggregateRecord,
  readRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// Fuente real de pasos: HealthKit en iOS (agrega TODAS las apps/wearables que
// escriben ahí, no solo el sensor del teléfono) y Health Connect en Android
// (mismo rol: unifica Google Fit, relojes, etc.). Si el usuario no tiene
// Health Connect instalado o rechaza el permiso, se cae al viejo esquema de
// expo-sensors Pedometer (sensor propio del teléfono nomás) para que la app
// siga funcionando igual.
const POLL_MS = 15_000;
const STEPS_CACHE_KEY = 'camina_steps_cache_v1';
const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount';
// Health Connect: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY
const HC_MANUAL_ENTRY = 3;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
        const filter = { date: { startDate: startOfToday(), endDate: new Date() } };
        const stats = await queryStatisticsForQuantity(STEP_COUNT_IDENTIFIER, ['cumulativeSum'], {
          filter,
          unit: 'count',
        });
        // Antifraude: los pasos cargados a mano en Salud (HKWasUserEntered) no suman.
        const samples = await queryQuantitySamples(STEP_COUNT_IDENTIFIER, { filter, unit: 'count', limit: 0 });
        const manual = samples
          .filter((s) => s.metadata?.HKWasUserEntered === true)
          .reduce((acc, s) => acc + s.quantity, 0);
        if (!cancelled) setSteps(Math.max(0, Math.round((stats.sumQuantity?.quantity ?? 0) - manual)));
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
        const timeRangeFilter = {
          operator: 'between' as const,
          startTime: startOfToday().toISOString(),
          endTime: new Date().toISOString(),
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
        if (!cancelled) setSteps(Math.max(0, (result.COUNT_TOTAL ?? 0) - manual));
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

  // El sensor de CoreMotion (solo iPhone) se usa únicamente si Salud no está disponible.
  const iosSensorSteps = useIosSensorSteps(Platform.OS === 'ios' && sensorAvailable === true && !healthKit.ready);

  let result: {
    steps: number;
    available: boolean | null;
    source: StepSource;
    healthConnectStatus: HealthConnectStatus | null;
    live: boolean;
  };
  if (Platform.OS === 'ios') {
    if (healthKit.ready && healthKit.steps != null) {
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
