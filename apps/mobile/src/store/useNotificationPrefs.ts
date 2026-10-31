import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Qué avisos locales quiere recibir la persona (se guarda en el teléfono). Todo activo por defecto.
export type NotificationPrefs = { aliento: boolean; racha: boolean };
const KEY = 'camina_notification_prefs';
const DEFAULTS: NotificationPrefs = { aliento: true, racha: true };

interface State extends NotificationPrefs {
  set: (key: keyof NotificationPrefs, value: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useNotificationPrefs = create<State>((set, get) => ({
  ...DEFAULTS,
  set: (key, value) => {
    set({ [key]: value } as Pick<NotificationPrefs, keyof NotificationPrefs>);
    const { aliento, racha } = get();
    AsyncStorage.setItem(KEY, JSON.stringify({ aliento, racha })).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<NotificationPrefs>;
      set({ aliento: v.aliento !== false, racha: v.racha !== false });
    } catch {
      // sin almacenamiento: quedan los valores por defecto
    }
  },
}));
