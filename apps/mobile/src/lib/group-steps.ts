import { supabase } from '@/lib/supabase';

export type MemberStepsRow = { user_id: string; day: string; steps: number };

// PostgREST (PGRST202) o Postgres (42883): la base todavía no tiene la función.
function isMissingFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '');
}

// Pasos de los integrantes de tus grupos desde `since` (YYYY-MM-DD, como máximo 7 días atrás).
// Usa la función segura group_members_steps (migración 0051), que sí deja ver a los demás miembros.
// Si la base todavía no la tiene, lee steps_daily como antes: ahí solo vienen los pasos propios.
// Cualquier otro error (sin red, sin permiso) se propaga para que la pantalla muestre el aviso.
export async function fetchMemberSteps(memberIds: string[], since: string): Promise<MemberStepsRow[]> {
  const { data, error } = await supabase.rpc('group_members_steps', { p_since: since });
  if (!error) {
    const ids = new Set(memberIds);
    return ((data ?? []) as MemberStepsRow[]).filter((r) => ids.has(r.user_id));
  }
  if (!isMissingFunction(error)) throw error;

  const { data: rows, error: rowsError } = await supabase
    .from('steps_daily')
    .select('user_id, day, steps')
    .in('user_id', memberIds)
    .gte('day', since);
  if (rowsError) throw rowsError;
  return rows ?? [];
}
