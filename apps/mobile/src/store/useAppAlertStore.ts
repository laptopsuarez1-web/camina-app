import { create } from 'zustand';

// Cola de avisos de la app (reemplazan a la ventana gris del sistema). Se muestran de a uno, en orden.
export type AppAlertButton = { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };
export type AppAlertTone = 'ok' | 'error' | 'ask';
export type AppAlert = { id: number; title: string; message?: string; buttons: AppAlertButton[]; tone: AppAlertTone; cancelable: boolean };

// Títulos que avisan de un problema: llevan al Baifo confundido en vez del que festeja.
const ERROR_TITLE = /^(no |falta|algo salió|error|sin |ups|google no|apple no|camina es para|código|contraseña|correo|ya |todavía no|espera|muy )/i;

export function alertTone(title: string, buttons: AppAlertButton[]): AppAlertTone {
  if (buttons.length > 1) return 'ask';
  return ERROR_TITLE.test(title.trim()) ? 'error' : 'ok';
}

type State = {
  queue: AppAlert[];
  // Hay un AppAlertHost montado: si no, el aviso sale por la ventana del sistema para no perderse.
  hostReady: boolean;
  setHostReady: (ready: boolean) => void;
  push: (title: string, message?: string, buttons?: AppAlertButton[], cancelable?: boolean) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useAppAlertStore = create<State>((set) => ({
  queue: [],
  hostReady: false,
  setHostReady: (hostReady) => set({ hostReady }),
  push: (title, message, buttons, cancelable) => {
    const list = buttons && buttons.length > 0 ? buttons : [{ text: 'Entendido' }];
    set((s) => ({ queue: [...s.queue, { id: nextId++, title, message, buttons: list, tone: alertTone(title, list), cancelable: cancelable ?? true }] }));
  },
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),
}));
