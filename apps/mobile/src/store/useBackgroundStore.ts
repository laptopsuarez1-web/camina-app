import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUNDS, DEFAULT_BACKGROUND } from '@/components/ui/backgrounds';

const KEY = 'camina_background';

interface BackgroundState {
  id: string;
  setId: (id: string) => void;
  hydrate: () => Promise<void>;
}

const valid = (id: string | null): id is string => !!id && BACKGROUNDS.some((b) => b.id === id);

export const useBackgroundStore = create<BackgroundState>((set) => ({
  id: DEFAULT_BACKGROUND,
  setId: (id) => {
    if (!valid(id)) return;
    set({ id });
    AsyncStorage.setItem(KEY, id).catch(() => {});
  },
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (valid(v)) set({ id: v });
    } catch {
      // sin almacenamiento: se queda el fondo por defecto
    }
  },
}));
