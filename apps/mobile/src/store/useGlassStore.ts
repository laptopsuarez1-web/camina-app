import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cuánto se transparenta el "vidrio" de tarjetas y barra: 0 = sólido (como antes),
// 1 = equilibrado (por defecto), 2 = cristal (el más transparente).
export type GlassLevel = 0 | 1 | 2;
const KEY = 'camina_glass_level';

interface GlassState {
  level: GlassLevel;
  setLevel: (level: GlassLevel) => void;
  hydrate: () => Promise<void>;
}

export const useGlassStore = create<GlassState>((set) => ({
  level: 1,
  setLevel: (level) => {
    set({ level });
    AsyncStorage.setItem(KEY, String(level)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v === '0' || v === '1' || v === '2') set({ level: Number(v) as GlassLevel });
    } catch {
      // sin almacenamiento: se queda el valor por defecto
    }
  },
}));
