-- PROPUESTA 0051 — RPC para que los grupos puedan ver los pasos de sus miembros (sin abrir steps_daily)
--
-- Hallazgos: SEC-29 y CR-02 (alto).
-- Qué arregla: los tres hooks de Grupos (useMyGroupsWeek, useGroupDetail, useGroupRanking) leen steps_daily de los demás miembros, pero
--   la RLS de steps_daily ("steps: select own") solo devuelve las filas propias. Resultado: puestos, totales semanales y "caminaron hoy"
--   se calculan solo con los pasos de la propia persona y los demás aparecen en cero. El parche tentador (abrir la lectura de
--   steps_daily a los miembros del grupo) filtraría pasos a cualquiera que se una a un grupo (SEC-09: hoy cualquiera puede unirse a
--   cualquier grupo conociendo el id).
-- Qué hace: crea group_members_steps(p_since date), security definer, que devuelve (user_id, day, steps) SOLO de las personas que
--   comparten algún grupo con quien llama (auth.uid()), y SOLO de los últimos 8 días (hoy - 7 en adelante; p_since puede acotar más pero
--   nunca ampliar), para no exponer historial. Sin sesión devuelve cero filas. No se toca steps_daily ni su RLS.
-- Impacto en el cliente: ninguno hasta que la app lo use. CAMBIO NECESARIO EN LA APP (no se hace acá, apps/ no se toca): reemplazar en los tres
--   hooks la consulta a steps_daily por supabase.rpc('group_members_steps', { p_since: monday }) y filtrar por memberIds en el cliente
--   (el resultado ya trae solo gente de sus grupos). Las columnas son user_id, day y steps: las mismas que leen hoy.
-- Qué ven los miembros entre sí (decisión de producto ya implícita en la app): los pasos diarios de la última semana, no la meta ni el resto.
-- Idempotente: sí.
-- Cómo se revierte: drop function if exists public.group_members_steps(date);

create or replace function public.group_members_steps(p_since date default null)
returns table (user_id uuid, day date, steps integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, s.day, s.steps
  from steps_daily s
  where auth.uid() is not null
    and s.day >= greatest(coalesce(p_since, local_today() - 7), local_today() - 7)
    and s.user_id in (
      select gm.user_id
      from group_members gm
      where gm.group_id in (select mine.group_id from group_members mine where mine.user_id = auth.uid())
    );
$$;

revoke execute on function public.group_members_steps(date) from public, anon;
grant execute on function public.group_members_steps(date) to authenticated;
