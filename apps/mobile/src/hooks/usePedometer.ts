import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// iOS: Pedometer.getStepCountAsync(start, end) da un rango de fechas real —
// se re-consulta cada 30s. Confirmado en el paquete instalado (Pedometer.d.ts)
// que esta función está marcada "@platform ios" nomás: en Android devuelve
// rechazo/no-op, así que "pasos hoy" quedaba siempre en 0 ahí.
//
// Android: no hay query por rango de fechas en expo-sensors, solo
// watchStepCount(cb), que entrega un conteo acumulado desde que empezás a
// escuchar (no sabemos con certeza si ese acumulado arranca en 0 o viene de
// más atrás — no hay forma de confirmarlo sin la doc de la versión instalada,
// así que nunca confiamos en el valor absoluto). Por eso se toma el PRIMER
// valor recibido como punto cero propio y se suma el delta contra un baseline
// del día guardado en AsyncStorage, reseteado cuando cambia la fecha local.
const POLL_MS = 30_000;
const ANDROID_BASELINE_KEY = 'camina_pedometer_android_baseline_v1';

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function useIosSteps(available: boolean | null) {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;

    async function readToday() {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      try {
        const result = await Pedometer.getStepCountAsync(start, new Date());
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
  }, [available]);

  return steps;
}

function useAndroidSteps(available: boolean | null) {
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    let sub: ReturnType<typeof Pedometer.watchStepCount> | null = null;

    readBaseline().then((baseline) => {
      if (cancelled) return;
      setSteps(baseline.baselineSteps);

      sub = Pedometer.watchStepCount(async (result) => {
        const current = await readBaseline();
        if (current.date !== localDateKey()) {
          // cambió el día mientras la app estaba abierta: arranca de cero
          const reset: AndroidBaseline = {
            date: localDateKey(),
            baselineSteps: 0,
            subscriptionStart: result.steps,
          };
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
  }, [available]);

  return steps;
}

export function useTodaySteps() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    Pedometer.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  const iosSteps = useIosSteps(Platform.OS === 'ios' ? available : false);
  const androidSteps = useAndroidSteps(Platform.OS === 'android' ? available : false);

  const steps = Platform.OS === 'ios' ? iosSteps : androidSteps;
  return { steps, available };
}
