import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const POLL_MS = 30_000;
const ANDROID_BASELINE_KEY = 'camina_pedometer_android_baseline_v1';
const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount';
// Health Connect: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY
const HC_MANUAL_ENTRY = 3;

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------- HealthKit (iOS) ----------
function useHealthKitSteps(enabled: boolean) {
  const [steps, setSteps] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

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

  return { steps, ready };
}

// ---------- Health Connect (Android) ----------
function useHealthConnectSteps(enabled: boolean) {
  const [steps, setSteps] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

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

    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        const status = await getSdkStatus();
        if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
          if (!cancelled) setReady(false);
          return;
        }
        const initialized = await initializeHealthConnect();
        if (!initialized) {
          if (!cancelled) setReady(false);
          return;
        }
        const granted = await requestHealthConnectPermission([{ accessType: 'read', recordType: 'Steps' }]);
        if (!granted.some((p) => 'recordType' in p && p.recordType === 'Steps')) {
          if (!cancelled) setReady(false);
          return;
        }
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

  return { steps, ready };
}

// ---------- Fallback: sensor crudo del teléfono (expo-sensors) ----------
type AndroidBaseline = { date: string; baselineSteps: number; subscriptionStart: number | null };

async function readBaseline(): Promise<AndroidBaseline> {
  const raw = await AsyncStorage.getItem(ANDROID_BASELINE_KEY);
  const today = localDateKey();
  if (raw) {
    const parsed = JSON.parse(raw) as AndroidBaseline;
    if (parsed.date === today) return parsed;
  }
  const fresh: AndroidBaseline = { date: today, baselineSteps: 0, subscriptionStart: null };
  await AsyncStorage.setItem(ANDROID_BASELINE_KEY, JSON.stringify(fresh));
  return fresh;
}

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

function useAndroidSensorSteps(enabled: boolean) {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let sub: ReturnType<typeof Pedometer.watchStepCount> | null = null;

    readBaseline().then((baseline) => {
      if (cancelled) return;
      setSteps(baseline.baselineSteps);

      sub = Pedometer.watchStepCount(async (result) => {
        const current = await readBaseline();
        if (current.date !== localDateKey()) {
          const reset: AndroidBaseline = { date: localDateKey(), baselineSteps: 0, subscriptionStart: result.steps };
          await AsyncStorage.setItem(ANDROID_BASELINE_KEY, JSON.stringify(reset));
          setSteps(0);
          return;
        }
        if (current.subscriptionStart === null) {
          const updated: AndroidBaseline = { ...current, subscriptionStart: result.steps };
          await AsyncStorage.setItem(ANDROID_BASELINE_KEY, JSON.stringify(updated));
          setSteps(current.baselineSteps);
          return;
        }
        const delta = Math.max(0, result.steps - current.subscriptionStart);
        setSteps(current.baselineSteps + delta);
      });
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return steps;
}

export type StepSource = 'healthkit' | 'health-connect' | 'sensor' | null;

export function useTodaySteps() {
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    Pedometer.isAvailableAsync()
      .then(setSensorAvailable)
      .catch(() => setSensorAvailable(false));
  }, []);

  const healthKit = useHealthKitSteps(Platform.OS === 'ios');
  const healthConnect = useHealthConnectSteps(Platform.OS === 'android');

  // El sensor crudo solo se prende si la fuente de Salud no está lista (sin
  // permiso, sin Health Connect instalado, etc.) — evita pedir dos permisos
  // de golpe y usar dos fuentes distintas a la vez.
  const healthReady = Platform.OS === 'ios' ? healthKit.ready : healthConnect.ready;
  const iosSensorSteps = useIosSensorSteps(Platform.OS === 'ios' && sensorAvailable === true && !healthReady);
  const androidSensorSteps = useAndroidSensorSteps(Platform.OS === 'android' && sensorAvailable === true && !healthReady);

  if (Platform.OS === 'ios') {
    if (healthKit.ready && healthKit.steps != null) {
      return { steps: healthKit.steps, available: true, source: 'healthkit' as StepSource };
    }
    return { steps: iosSensorSteps, available: sensorAvailable, source: sensorAvailable ? ('sensor' as StepSource) : null };
  }

  if (healthConnect.ready && healthConnect.steps != null) {
    return { steps: healthConnect.steps, available: true, source: 'health-connect' as StepSource };
  }
  return { steps: androidSensorSteps, available: sensorAvailable, source: sensorAvailable ? ('sensor' as StepSource) : null };
}
