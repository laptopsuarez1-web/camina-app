import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import {
  configureBackgroundTypes,
  subscribeToChanges,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit';
import {
  initialize as initializeHealthConnect,
  getGrantedPermissions,
  requestPermission as requestHealthConnectPermission,
} from 'react-native-health-connect';
import { supabase } from '@/lib/supabase';
import { STEP_COUNT_IDENTIFIER } from '@/lib/health-steps';
import { syncToday } from '@/lib/steps-sync';

// Sincronización de pasos con la app cerrada, para que los Puntos de hoy no dependan de abrirla.
// - Android: una tarea periódica (WorkManager, cada 15 min o más) lee Health Connect y manda los pasos de hoy.
//   Necesita el permiso "leer en segundo plano" de Health Connect (se pide una vez).
// - iPhone: HealthKit despierta la app cuando hay pasos nuevos (como mucho una vez por hora; Apple decide cuándo)
//   y además hay una tarea periódica de respaldo. Si la persona cierra Camina deslizándola, iOS puede dejar de despertarla.
// Todo es idempotente: el servidor solo acredita los Puntos que falten.
const TASK_NAME = 'camina-sync-pasos';
const BG_ENABLED_KEY = 'camina_bg_steps_v1';
const HC_BG_ASKED_KEY = 'camina_hc_bg_asked_v1';
const MIN_GAP_MS = 2 * 60_000;

let lastRun = 0;
let running: Promise<void> | null = null;

// Manda los pasos de hoy si hay sesión. Nunca lanza: corre sin pantalla y no hay nadie a quien mostrarle un error.
export function syncStepsInBackground(): Promise<void> {
  if (running) return running;
  if (Date.now() - lastRun < MIN_GAP_MS) return Promise.resolve();
  running = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      if (Platform.OS === 'android') await initializeHealthConnect();
      await syncToday(userId);
      lastRun = Date.now();
    } catch {
      // sin red, teléfono bloqueado (Salud no se puede leer) o sin permiso: se intenta en la próxima
    } finally {
      running = null;
    }
  })();
  return running;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK_NAME, async () => {
    await syncStepsInBackground();
    return BackgroundTask.BackgroundTaskResult.Success;
  });

  // iPhone: en cada arranque (también cuando HealthKit despierta la app) se vuelve a escuchar a Salud.
  if (Platform.OS === 'ios') {
    AsyncStorage.getItem(BG_ENABLED_KEY)
      .then((v) => {
        if (v === '1') subscribeToChanges(STEP_COUNT_IDENTIFIER, () => { syncStepsInBackground(); });
      })
      .catch(() => {});
  }
}

async function askAndroidBackgroundRead() {
  const granted = await getGrantedPermissions();
  if (granted.some((p) => p.recordType === 'BackgroundAccessPermission')) return;
  // Se pregunta una sola vez: si la persona dice que no, no se insiste.
  if (await AsyncStorage.getItem(HC_BG_ASKED_KEY)) return;
  await AsyncStorage.setItem(HC_BG_ASKED_KEY, '1');
  await requestHealthConnectPermission([{ accessType: 'read', recordType: 'BackgroundAccessPermission' }]);
}

// Se llama cuando la fuente de pasos ya está lista (permiso de Pasos dado).
export async function enableBackgroundSteps() {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await askAndroidBackgroundRead();
    } else {
      await configureBackgroundTypes([STEP_COUNT_IDENTIFIER], UpdateFrequency.hourly);
      if ((await AsyncStorage.getItem(BG_ENABLED_KEY)) !== '1') {
        await AsyncStorage.setItem(BG_ENABLED_KEY, '1');
        subscribeToChanges(STEP_COUNT_IDENTIFIER, () => { syncStepsInBackground(); });
      }
    }
    if (!(await TaskManager.isTaskRegisteredAsync(TASK_NAME))) {
      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
    }
  } catch {
    // sin segundo plano la app sigue funcionando: los pasos se mandan al abrirla
  }
}
