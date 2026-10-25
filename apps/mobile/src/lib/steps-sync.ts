import { supabase } from '@/lib/supabase';
import { dayISO, readDaySteps } from '@/lib/health-steps';

// Manda al servidor los pasos de un día (idempotente: acredita solo los Puntos que falten).
// El servidor acepta hoy y ayer; Inicio manda hoy cada vez que cambian y esto cubre el resto.
export async function sendDaySteps(userId: string, day: Date, steps: number) {
  const { error } = await supabase.rpc('earn_points_from_steps', {
    p_user_id: userId,
    p_day: dayISO(day),
    p_steps: steps,
  });
  if (error) throw error;
}

async function syncDay(userId: string, day: Date): Promise<boolean> {
  const steps = await readDaySteps(day);
  if (steps == null || steps <= 0) return false;
  await sendDaySteps(userId, day, steps);
  return true;
}

// Los pasos de ayer completos: si ayer entraste pero no de noche, al abrir la app hoy se acreditan los que faltaban.
export function syncYesterday(userId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return syncDay(userId, yesterday);
}

// Ayer y hoy, para cuando la app se despierta sola. Devuelve cuántos días se mandaron.
export async function syncRecentDays(userId: string): Promise<number> {
  let sent = 0;
  if (await syncYesterday(userId)) sent += 1;
  if (await syncDay(userId, new Date())) sent += 1;
  return sent;
}
