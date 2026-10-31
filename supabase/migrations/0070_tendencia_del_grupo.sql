-- PROPUESTA 0070 — Pasos diarios de los últimos 30 días de las personas de UN grupo (para "Tendencia del grupo")
--
-- Qué arregla / agrega: group_members_steps (0051) solo deja ver 8 días. La tarjeta "Tendencia del grupo" de la pantalla del grupo compara
--   a los integrantes en los últimos 30 días, así que hace falta una segunda función, más angosta que la 0051 a propósito:
--   solo responde si quien llama es integrante del grupo pedido, y solo devuelve a los integrantes de ESE grupo (no de todos sus grupos).
-- Qué ven los miembros entre sí: los pasos diarios de los últimos 30 días, nada más (ni meta ni días sin abrir la app).
-- Sin sesión, o si no sos integrante, devuelve cero filas. No se toca steps_daily ni su RLS.
-- Impacto en el cliente: la app la llama con rpc('group_trend_steps', { p_group }). Si la base todavía no la tiene, la tarjeta no se muestra.
-- Idempotente: sí.
-- Cómo se revierte: drop function if exists public.group_trend_steps(uuid);

create or replace function public.group_trend_steps(p_group uuid)
returns table (user_id uuid, day date, steps integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, s.day, s.steps
  from steps_daily s
  where auth.uid() is not null
    and exists (select 1 from group_members me where me.group_id = p_group and me.user_id = auth.uid())
    and s.day >= local_today() - 29
    and s.user_id in (select gm.user_id from group_members gm where gm.group_id = p_group);
$$;

revoke execute on function public.group_trend_steps(uuid) from public, anon;
grant execute on function public.group_trend_steps(uuid) to authenticated;
