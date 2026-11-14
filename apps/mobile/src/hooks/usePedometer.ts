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
import { Sentry } from '@/lib/monitoring';
import { syncYesterdayOnOpen } from '@/lib/steps-sync';
import { boliviaDay } from '@/lib/bolivia';
import { STEP_COUNT_IDENTIFIER, startOfDay, readHealthKitSteps, readHealthConnectSteps } from '@/lib/health-steps';
import { readSensorDaySteps, requestSensorPermission, sensorStatus, type SensorStatus } from '@/lib/sensor-steps';

// Fuente real de pasos: HealthKit en iOS (agrega TODAS las apps/wearables que
// escriben ahí, no solo el sensor del teléfono) y Health Connect en Android
// (mismo rol: unifica Google Fit, relojes, etc.). En iPhone, si Salud no está
// disponible, se cae al sensor del teléfono (expo-sensors Pedometer). En Android
// no hay sensor de respaldo: sin Health Connect no se cuentan pasos.
const POLL_MS = 15_000;
const STEPS_CACHE_KEY = 'camina_steps_cache_v1';
// Ya se pidió una vez, solo, el permiso de actividad física para el contador del teléfono.
const SENSOR_ASKED_KEY = 'camina_sensor_permission_asked';

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
        syncYesterdayOnOpen();
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

// «permiso: Permission delegate not initialized», en una línea corta.
function describeError(paso: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return `${paso}: ${msg.replace(/\s+/g, ' ').trim()}`.slice(0, 110);
}

// Lo que Sentry mostró en celulares Tecno: Health Connect puede cortar la comunicación un momento («Binding to service
// failed», «Binding died», «Null binding») y, en Android 14 o más, soltar un «Caller requires READ_STEPS» pasajero
// aunque el permiso esté dado. Un fallo suelto no debe mostrar el cartel de error: se reintenta solo.
export type HealthConnectErrorKind = 'service' | 'permission' | 'other';
function errorKindOf(e: unknown): HealthConnectErrorKind {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (/binding|remoteexception|null binding|service/i.test(msg)) return 'service';
  if (/READ_STEPS|SecurityException|permission/i.test(msg)) return 'permission';
  return 'other';
}
// Cuántas lecturas seguidas tienen que fallar antes de avisarle a la persona.
const READ_FAILS_BEFORE_ALERT = 3;
const READ_RETRY_MS = 3_000;

function useHealthConnectSteps(enabled: boolean) {
  const [steps, setSteps] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<HealthConnectStatus>('checking');
  // Qué falló, en una línea corta, para mostrarlo en el cartel de error y poder ayudar a quien lo ve.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<HealthConnectErrorKind | null>(null);
  // Cada vez que cambia, se vuelve a hacer todo el arranque (estado, permiso, lectura): el botón Reintentar lo usa.
  const [attempt, setAttempt] = useState(0);
  // Contador de pasos del teléfono: si existe en esta versión y si ya tiene el permiso de actividad física.
  const [sensor, setSensor] = useState<SensorStatus>('unavailable');
  const readRef = useRef<() => Promise<void>>(async () => {});
  const errorRef = useRef(false);
  useEffect(() => {
    errorRef.current = status === 'error';
  }, [status]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    let cancelled = false;
    let paso = 'estado';
    let fails = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let permissionAsked = false;

    async function readToday() {
      try {
        const value = await readHealthConnectSteps(startOfToday(), new Date());
        fails = 0;
        permissionAsked = false;
        if (!cancelled) { setSteps(value); setErrorDetail(null); setErrorKind(null); setStatus('ok'); }
      } catch (e) {
        // Antes un fallo de lectura se tragaba en silencio y la pantalla mostraba 0 pasos como si fuera verdad.
        // Queda registrado para saber la causa real; el aviso a la persona solo sale si el fallo se repite.
        const kind = errorKindOf(e);
        fails += 1;
        Sentry.captureException(e, { tags: { flujo: 'health_connect_lectura', tipo: kind, intento: String(fails) } });
        if (cancelled) return;
        // «Caller requires READ_STEPS»: se vuelve a pedir el permiso una vez antes de rendirse.
        if (kind === 'permission' && !permissionAsked) {
          permissionAsked = true;
          try {
            await requestHealthConnectPermission([{ accessType: 'read', recordType: 'Steps' }]);
          } catch {
            // se sigue con el reintento de abajo
          }
        }
        if (fails < READ_FAILS_BEFORE_ALERT) {
          // Se conserva el último valor y se reintenta enseguida, sin mostrar nada.
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => { void readToday(); }, READ_RETRY_MS);
          return;
        }
        setSteps(null);
        setErrorDetail(describeError('lectura', e));
        setErrorKind(kind);
        setStatus(kind === 'permission' ? 'denied' : 'error');
      }
    }

    readRef.current = readToday;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        paso = 'estado';
        const sdkStatus = await getSdkStatus();
        if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
          if (!cancelled) { setReady(false); setStatus('unavailable'); }
          return;
        }
        paso = 'iniciar';
        const initialized = await initializeHealthConnect();
        if (!initialized) {
          if (!cancelled) { setReady(false); setStatus('unavailable'); }
          return;
        }
        paso = 'permiso';
        const granted = await requestHealthConnectPermission([{ accessType: 'read', recordType: 'Steps' }]);
        if (!granted.some((p) => 'recordType' in p && p.recordType === 'Steps')) {
          if (!cancelled) { setReady(false); setStatus('denied'); }
          return;
        }
        if (cancelled) return;
        setReady(true);
        setStatus('ok');
        paso = 'lectura';
        syncYesterdayOnOpen();
        await readToday();
        interval = setInterval(readToday, POLL_MS);
      } catch (e) {
        // Un fallo técnico no es lo mismo que negar el permiso. Se registra qué paso falló para saber la causa real.
        const kind = errorKindOf(e);
        Sentry.captureException(e, { tags: { flujo: 'health_connect_inicio', paso, tipo: kind } });
        if (!cancelled) { setReady(false); setErrorDetail(describeError(paso, e)); setErrorKind(kind); setStatus('error'); }
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled, attempt]);

  // Con error, Reintentar repite todo el arranque (antes solo repetía la lectura, que falla igual si el arranque falló).
  const refresh = useCallback(async () => {
    if (errorRef.current) setAttempt((a) => a + 1);
    else await readRef.current();
  }, []);

  // ---- Contador de pasos del teléfono ----
  // Se usa cuando Health Connect no tiene pasos de hoy, no está instalado o no dio permiso: así se cuenta igual,
  // sin que la persona tenga que instalar Google Fit. Si hace falta el permiso de actividad física, se pide solo,
  // una vez (después queda el botón del aviso de Inicio).
  const [sensorSteps, setSensorSteps] = useState<number | null>(null);
  const hcEmpty = status !== 'checking' && (status !== 'ok' || (steps ?? 0) === 0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    sensorStatus().then(setSensor).catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android' || !hcEmpty) return;
    let cancelled = false;
    (async () => {
      if ((await sensorStatus()) !== 'needs-permission') return;
      if (await AsyncStorage.getItem(SENSOR_ASKED_KEY)) return;
      await AsyncStorage.setItem(SENSOR_ASKED_KEY, '1');
      await requestSensorPermission();
      const st = await sensorStatus();
      if (!cancelled) setSensor(st);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, hcEmpty]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android' || sensor !== 'active') return;
    let cancelled = false;
    const tick = async () => {
      const value = await readSensorDaySteps(new Date());
      if (!cancelled && value != null) setSensorSteps(value);
    };
    // Ayer también se cierra con el contador si Health Connect no está (si está, ya lo hace su arranque).
    syncYesterdayOnOpen();
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, sensor]);

  // Botón del aviso de Inicio: pide el permiso y, si lo da, empieza a contar.
  const enableSensor = useCallback(async () => {
    const ok = await requestSensorPermission();
    setSensor(await sensorStatus());
    return ok;
  }, []);

  return { steps, ready, status, errorDetail, errorKind, refresh, sensor, sensorSteps, enableSensor };
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
  return boliviaDay();
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
    errorDetail?: string | null;
    errorKind?: HealthConnectErrorKind | null;
    live: boolean;
  };
  if (Platform.OS === 'ios') {
    if (healthKit.ready && healthKit.steps != null && healthKit.steps >= iosSensorSteps) {
      result = { steps: healthKit.steps, available: true, source: 'healthkit', healthConnectStatus: null, live: true };
    } else {
      result = { steps: iosSensorSteps, available: sensorAvailable, source: sensorAvailable ? 'sensor' : null, healthConnectStatus: null, live: sensorAvailable === true };
    }
  } else if (healthConnect.ready && healthConnect.steps != null) {
    const steps = Math.max(healthConnect.steps, healthConnect.sensor === 'active' ? healthConnect.sensorSteps ?? 0 : 0);
    // Android: Health Connect (se descartan los cargados a mano) y, si está vacío, el contador del propio teléfono,
    // que nadie puede editar. Se usa el que tenga más.
    result = { steps, available: true, source: steps > healthConnect.steps ? 'sensor' : 'health-connect', healthConnectStatus: 'ok', live: true };
  } else if (healthConnect.sensor === 'active' && healthConnect.sensorSteps != null) {
    // Sin Health Connect (no está, no dio permiso o falló): cuenta el teléfono y no se muestra ningún error.
    result = { steps: healthConnect.sensorSteps, available: true, source: 'sensor', healthConnectStatus: 'ok', live: true };
  } else {
    result = {
      steps: 0,
      available: healthConnect.status === 'checking' ? null : false,
      source: null,
      healthConnectStatus: healthConnect.status,
      errorDetail: healthConnect.status === 'error' ? healthConnect.errorDetail : null,
      errorKind: healthConnect.status === 'error' ? healthConnect.errorKind : null,
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
  return { ...result, steps: result.live ? result.steps : Math.max(result.steps, cached ?? 0), refresh, sensorStatus: healthConnect.sensor, enableSensor: healthConnect.enableSensor };
}

// ---------- Historial de pasos por día (solo para mostrar en Actividad) ----------
// Salud ya tiene los pasos de los días en que no abriste la app. Se muestran en Actividad pero NO
// suman Puntos: los Puntos solo se cargan con la app abierta (earn_points_from_steps).
function dayKey(d: Date) {
  return boliviaDay(d);
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
