import { supabase } from '@/lib/supabase';
import { dayISO, readDaySteps } from '@/lib/health-steps';
import { registerDevice } from '@/lib/device';

// Manda al servidor los pasos de un día (idempotente: acredita solo los Puntos que falten).
// Solo cuenta el día en curso: los pasos de ayer no dan Puntos (el servidor los ignora).
export async function sendDaySteps(userId: string, day: Date, steps: number) {
  // El servidor solo suma pasos si el celular ya está registrado para esta cuenta (un celular, una cuenta).
  await registerDevice(userId);
  const { error } = await supabase.rpc('earn_points_from_steps', {
    p_user_id: userId,
    p_day: dayISO(day),
    p_steps: steps,
  });
  if (error) throw error;
}

// Los pasos de hoy, para cuando la app se despierta sola. Devuelve si se mandaron.
export async function syncToday(userId: string): Promise<boolean> {
  const today = new Date();
  const steps = await readDaySteps(today);
  if (steps == null || steps <= 0) return false;
  await sendDaySteps(userId, today, steps);
  return true;
}
