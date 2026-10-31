import { create } from 'zustand';
import type { EndedCinematic, JoinedCinematic } from '@/components/challenge/ChallengeCinematics';
import type {
  EventJoinedCinematic, FriendMadeCinematic, GroupCreatedCinematic, GroupGoalCinematic, GroupJoinedCinematic, RankingResultCinematic, StreakCinematic, StreakWeekCinematic, TicketBoughtCinematic,
} from '@/components/celebrations/MomentScenes';

// Celebraciones y avisos de logros. Hay tres tamaños, de menor a mayor:
//  - toast: aviso corto arriba (o abajo, con at: 'bottom') que se va solo (racha, "se unió un amigo");
//  - sheet: hoja desde abajo con chispas (reto cumplido, bienvenida);
//  - win: pantalla completa para un gran logro;
//  - challenge-joined / challenge-ended: cinemáticas de los desafíos (sumarse y terminar);
//  - ticket-bought, event-joined, group-joined, group-created, friend-made, streak-milestone, streak-week, group-goal, ranking-result: escenas de momentos grandes.
export type ToastIcon = 'flame' | 'gift' | 'check' | 'users';
export type Celebration =
  | { kind: 'toast'; icon: ToastIcon; title: string; body?: string; at?: 'top' | 'bottom' }
  | { kind: 'sheet'; title: string; body?: string; points?: number; cta?: string; sparks?: boolean }
  | { kind: 'win'; title: string; body?: string; points: number }
  | JoinedCinematic
  | EndedCinematic
  | TicketBoughtCinematic
  | EventJoinedCinematic
  | GroupJoinedCinematic
  | GroupCreatedCinematic
  | FriendMadeCinematic
  | StreakCinematic
  | StreakWeekCinematic
  | GroupGoalCinematic
  | RankingResultCinematic;

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
