// Reglas puras de las historias de Instagram por un canje (sin dependencias de Expo, para poder probarlas).
import type { StoryShare, StoryShareStatus } from './database.types';

export const STORY_WINDOW_DAYS = 7; // igual que story_window_days() en la base (0055)

export type StoryState = 'available' | 'pending' | 'approved' | 'rejected';

// Estado del botón de un canje: null si no corresponde (no confirmado o de hace más de 7 días, sin historia mandada).
export function storyStateFor(
  r: { status: string; confirmed_at?: string | null },
  share: Pick<StoryShare, 'status'> | undefined,
  now = Date.now(),
): StoryState | null {
  if (share) return share.status as StoryShareStatus;
  if (r.status !== 'confirmed' || !r.confirmed_at) return null;
  const age = now - new Date(r.confirmed_at.replace(/(\.\d{3})\d+/, '$1')).getTime();
  return age <= STORY_WINDOW_DAYS * 86_400_000 ? 'available' : null;
}

// Usuario de Instagram: sin @ ni espacios, en minúsculas. Vacío si no es válido.
export function normalizeHandle(raw: string): string {
  const h = raw.trim().replace(/^@+/, '').toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : '';
}
