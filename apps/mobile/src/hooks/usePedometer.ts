import { useEffect, useState } from 'react';
import { Pedometer } from 'expo-sensors';

// Pasos del día corriente leídos del podómetro nativo (CMPedometer en iOS,
// sensor de pasos de Android vía expo-sensors). Se re-consulta cada 30s en
// vez de usar watchStepCount, cuya semántica de "delta vs. acumulado" difiere
// entre iOS/Android — revisar la doc de la versión de Expo instalada
// (ver AGENTS.md) antes de cambiar esto por un stream en vivo.
// El tope de 20 Puntos/día NO se aplica acá: vive en el servidor
// (earn_points_from_steps), esto solo refleja lo que dice el sensor.
const POLL_MS = 30_000;

export function useTodaySteps() {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function readToday() {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      try {
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (!cancelled) setSteps(result.steps);
      } catch {
        // el rango de fechas puede no estar soportado en algunos Android; se mantiene el último valor conocido
      }
    }

    Pedometer.isAvailableAsync()
      .then((isAvailable) => {
        setAvailable(isAvailable);
        if (!isAvailable || cancelled) return;
        readToday();
        interval = setInterval(readToday, POLL_MS);
      })
      .catch(() => setAvailable(false));

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  return { steps, available };
}
