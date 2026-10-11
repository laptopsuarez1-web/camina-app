import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cuánto se transparenta el "vidrio" de tarjetas y barra, de 0 (sólido, como antes) a 1 (cristal).
// El valor por defecto es el vidrio lila: translúcido sin perder lectura.
export const DEFAULT_GLASS = 0.65;
const KEY = 'camina_glass_amount';
const LEGACY_KEY = 'camina_glass_level'; // antes eran tres niveles: 0, 1 y 2

interface GlassState {
  amount: number;
  /** Mueve el deslizador (se ve al instante). */
  setAmount: (amount: number) => void;
  /** Guarda el valor, al soltar el deslizador. */
  persist: () => void;
  hydrate: () => Promise<void>;
}

export const useGlassStore = create<GlassState>((set, get) => ({
  amount: DEFAULT_GLASS,
  setAmount: (amount) => set({ amount: Math.min(1, Math.max(0, amount)) }),
  persist: () => {
    AsyncStorage.setItem(KEY, String(get().amount)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v != null && !Number.isNaN(Number(v))) {
        set({ amount: Math.min(1, Math.max(0, Number(v))) });
        return;
      }
      const old = await AsyncStorage.getItem(LEGACY_KEY);
      if (old === '0') set({ amount: 0 });
      else if (old === '2') set({ amount: 1 });
    } catch {
      // sin almacenamiento: se queda el valor por defecto
    }
  },
}));
