import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planStreakReminders } from '@/lib/streak-reminder-plan';
import { planEncouragement } from '@/lib/encouragement-plan';
import { DAILY_POINTS_CAP, POINTS_PER_STEP_UNIT } from '@/constants/business-rules';

const ID_PREFIXES = ['camina-racha-', 'camina-aliento-'];

// Avisos locales (los programa el propio teléfono, no hace falta servidor ni llaves APNs/FCM): uno de día y uno de noche,
// para hoy (solo si todavía no cumplió la meta) y los próximos días. Cada vez que cambian los pasos se
// reemplazan por completo, así nunca se acumulan ni avisan de una meta que ya está cumplida. No pide permiso: solo se
// programa si ya está concedido (se pide desde Perfil o al abrir la app).
type Snapshot = { streak: number; stepsToday: number; goal: number; racha?: boolean; aliento?: boolean };

// Una pasada a la vez: si llegan dos cambios seguidos, la segunda espera a que termine la primera (así no se pisan al cancelar y programar).
let queue: Promise<void> = Promise.resolve();
export function syncStreakReminders(o: Snapshot): Promise<void> {
  queue = queue.then(() => run(o), () => run(o));
  return queue;
}

async function run(o: Snapshot): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (ID_PREFIXES.some((p) => n.identifier.startsWith(p))) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (perm.status !== 'granted') return;
    const now = new Date();
    const plan = [
      ...(o.racha === false ? [] : planStreakReminders(now, { streak: o.streak, metToday: o.stepsToday >= o.goal })),
      ...(o.aliento === false
        ? []
        : planEncouragement(now, {
            stepsToday: o.stepsToday,
            goal: o.goal,
            pointsToday: Math.min(Math.floor(o.stepsToday / POINTS_PER_STEP_UNIT), DAILY_POINTS_CAP),
            pointsCap: DAILY_POINTS_CAP,
          })),
    ];
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { type: 'streak_reminder' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: 'default' },
      });
    }
  } catch {
    // Es solo un recordatorio: si el sistema no deja programarlo, el aviso del servidor sigue funcionando.
  }
}
