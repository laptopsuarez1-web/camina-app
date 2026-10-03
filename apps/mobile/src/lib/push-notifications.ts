import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
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
let askedThisSession = false;
let currentToken: string | null = null;
let lastHandledTap: string | null = null;

// A qué pantalla lleva cada tipo de aviso (al tocar la notificación o la fila de la bandeja).
export function routeForNotification(type?: string): string {
  switch (type) {
    case 'redemption_expiring':
    case 'redemption':
    case 'nearby':
      return '/(tabs)/canjes';
    case 'reto':
      return '/(tabs)/eventos';
    case 'streak':
    case 'streak_reminder':
      return '/(tabs)';
    default:
      return '/(tabs)/notificaciones';
  }
}

// Abre la pantalla correspondiente cuando se toca un push, también si la app estaba cerrada.
export function useNotificationTaps(enabled: boolean) {
  useEffect(() => {
    // En la web no hay notificaciones push nativas.
    if (!enabled || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.identifier;
      if (id === lastHandledTap) return;
      lastHandledTap = id;
      const type = response.notification.request.content.data?.type;
      router.push(routeForNotification(typeof type === 'string' ? type : undefined) as never);
    };
    // App cerrada: se abrió tocando el push. App abierta o en segundo plano: llega por el listener.
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [enabled]);
}

// Al cerrar sesión, el teléfono deja de recibir los avisos de esa cuenta.
export async function unregisterPushToken(): Promise<void> {
  const token = currentToken;
  registered = false;
  currentToken = null;
  if (!token) return;
  try {
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Sin conexión: el token se reasigna cuando otra cuenta inicie sesión en este teléfono.
  }
}

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
  // Si ya dijo que no (y el sistema no deja volver a preguntar), no insistimos: se reactiva desde Perfil.
  if (status !== 'granted' && (askedThisSession || (existing.status === 'denied' && !existing.canAskAgain))) return;
  if (status !== 'granted') {
    askedThisSession = true;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = requested.status;
  }
  if (status !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Sin projectId de EAS no se puede pedir el token de Expo push.
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
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
