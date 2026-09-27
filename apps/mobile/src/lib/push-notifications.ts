import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// No hay push notifications reales en simulador/emulador (Apple y Google no
// entregan tokens ahí) ni en Expo Go desde SDK 53 — hace falta development
// build. Ver apps/mobile/README-notifications.md.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registered = false;

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (registered) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Camina',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4FC3A8',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = requested.status;
  }
  if (status !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Sin `eas init` corrido todavía (queda un extra.eas.projectId placeholder
    // en app.json) — no se puede pedir el token de Expo push sin esto.
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    if (!error) registered = true;
  } catch {
    // Sin conexión, simulador/emulador (no hay token real ahí), o falla puntual
    // contra el servidor de Expo — se reintenta la próxima vez que se monte el
    // layout autenticado (registered sigue false).
  }
}
