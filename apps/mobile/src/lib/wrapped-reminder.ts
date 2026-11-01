import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { monthName, nextWrappedReminder } from '@/lib/share-stats';

const REMINDER_ID = 'camina-wrapped';

// Aviso local (sin servidor) para el 1.º de cada mes a las 9:00: "Tu Wrapped de septiembre está listo". Solo se programa si la persona ya
// dio permiso de avisos (no se lo pedimos aquí) y se programa al abrir la app (no hace falta entrar a Actividad) y cada vez reemplaza al anterior, así nunca se acumulan.
export async function scheduleWrappedReminder(now: Date = new Date()): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    const { date, monthIndex } = nextWrappedReminder(now);
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: `Tu Wrapped de ${monthName(monthIndex)} está listo`,
        body: 'Tu resumen del mes ya está. Mira cómo caminaste y compártelo en tus historias.',
        data: { type: 'wrapped' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'default' },
    });
  } catch {
    // Es solo un recordatorio: si el sistema no deja programarlo, el banner de Actividad sigue estando.
  }
}
