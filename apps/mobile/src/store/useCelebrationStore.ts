import { create } from 'zustand';

// Celebraciones y avisos de logros. Hay tres tamaños, de menor a mayor:
//  - toast: aviso corto arriba que se va solo (racha, "se unió un amigo");
//  - sheet: hoja desde abajo con chispas (reto cumplido, bienvenida);
//  - win: pantalla completa, solo para el gran momento (ganar un desafío de grupo).
export type ToastIcon = 'flame' | 'gift' | 'check' | 'users';
export type Celebration =
  | { kind: 'toast'; icon: ToastIcon; title: string; body?: string }
  | { kind: 'sheet'; title: string; body?: string; points?: number; cta?: string; sparks?: boolean }
  | { kind: 'win'; title: string; body?: string; points: number };

interface CelebrationState {
  queue: (Celebration & { id: number })[];
  show: (c: Celebration) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useCelebrationStore = create<CelebrationState>((set) => ({
  queue: [],
  show: (c) => set((s) => ({ queue: [...s.queue, { ...c, id: nextId++ }] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

export const celebrate = (c: Celebration) => useCelebrationStore.getState().show(c);
