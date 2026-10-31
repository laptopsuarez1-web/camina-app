import { supabase } from '@/lib/supabase';
import { dayISO, readDaySteps } from '@/lib/health-steps';
import { registerDevice } from '@/lib/device';
import { queryClient } from '@/lib/query-client';

// Manda al servidor los pasos de un día (idempotente: acredita solo los Puntos que falten).
// Cuenta el día en curso y ayer, pero ayer solo si ese día ya abriste Camina (el servidor lo verifica).
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

// Al abrir la app: cierra el día de ayer con su total completo (hasta las 00). Si ayer no abriste Camina,
// el servidor no acredita nada. Una vez por día y por arranque; nunca lanza.
let yesterdaySentFor = '';
export async function syncYesterdayOnOpen(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const today = dayISO(new Date());
    if (yesterdaySentFor === userId + today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const steps = await readDaySteps(yesterday);
    if (steps == null || steps <= 0) return;
    // El saldo de antes tiene que estar en caché para que, al acreditar ayer, el chip de Puntos "cuente" hasta el valor nuevo.
    const balanceKey = ['points-balance', userId];
    if (queryClient.getQueryData<number>(balanceKey) === undefined) {
      const { data: before } = await supabase.rpc('user_points_balance', { p_user_id: userId });
      if (typeof before === 'number' && queryClient.getQueryData<number>(balanceKey) === undefined) queryClient.setQueryData(balanceKey, before);
    }
    await sendDaySteps(userId, yesterday, steps);
    // Antes el saldo no se refrescaba tras acreditar ayer, y los Puntos aparecían de golpe sin animación.
    queryClient.invalidateQueries({ queryKey: balanceKey });
    queryClient.invalidateQueries({ queryKey: ['points-today', userId] });
    yesterdaySentFor = userId + today;
  } catch {
    // sin red o sin permiso: se intenta en la próxima apertura
  }
}

// Los pasos de hoy, para cuando la app se despierta sola. Devuelve si se mandaron.
export async function syncToday(userId: string): Promise<boolean> {
  const today = new Date();
  const steps = await readDaySteps(today);
  if (steps == null || steps <= 0) return false;
  await sendDaySteps(userId, today, steps);
  return true;
}
