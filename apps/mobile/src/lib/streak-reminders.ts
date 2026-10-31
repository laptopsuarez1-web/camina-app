import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planStreakReminders } from '@/lib/streak-reminder-plan';

const ID_PREFIX = 'camina-racha-';

// Avisos locales (los programa el propio teléfono, no hace falta servidor ni llaves APNs/FCM): uno de día y uno de noche,
// para hoy (solo si todavía no cumplió la meta) y los próximos días. Cada vez que cambian los pasos se
// reemplazan por completo, así nunca se acumulan ni avisan de una meta que ya está cumplida. No pide permiso: solo se
// programa si ya está concedido (se pide desde Perfil o al abrir la app).
type Snapshot = { streak: number; stepsToday: number; goal: number };

export async function syncStreakReminders(o: Snapshot): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(ID_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (perm.status !== 'granted') return;
    const missing = Math.max(0, o.goal - o.stepsToday);
    const plan = planStreakReminders(new Date(), { streak: o.streak, metToday: missing === 0, missing });
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
