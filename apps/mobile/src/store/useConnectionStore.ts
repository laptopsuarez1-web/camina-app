import { create } from 'zustand';

// ¿Hay internet? Se deduce de los pedidos de la app (sin módulo nativo): si uno falla por red, se marca sin conexión;
// cuando cualquiera vuelve a salir bien, se marca conectado. Lo alimenta `watchConnection` (lib/connection.ts).
export const useConnectionStore = create<{ offline: boolean; setOffline: (offline: boolean) => void }>((set, get) => ({
  offline: false,
  setOffline: (offline) => { if (get().offline !== offline) set({ offline }); },
}));
