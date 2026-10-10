-- PROPUESTA 0053 — Texto del aviso de racha: "¡No cortes tu racha!" (antes decía "¡No cortés tu racha!")
--
-- Hallazgo: UXC-46 (medio, copy).
-- Qué arregla: el título del push de recordatorio de racha decía "¡No cortés tu racha! 🔥". En voseo, el imperativo negativo es "no cortes"
--   (no "no cortés"). Es un error gramatical que le llega como notificación a toda persona con racha.
-- Qué hace: vuelve a crear queue_streak_reminder_notifications() con el cuerpo EXACTO de la 0018 (supabase/migrations/0018_friendly_push_updates_favorites.sql)
--   cambiando solo el título. Misma lógica, mismo cuerpo del mensaje ("Llevás N días seguidos…"), misma clave anti-duplicado.
--   Los permisos no cambian (create or replace conserva que authenticated NO pueda ejecutarla, 0034).
-- Cuidado: la función viva en producción debe ser igual a la de la 0018 (el verificador comparó el texto del título y del cuerpo contra pg_proc).
--   Si el dueño la modificó a mano desde el SQL Editor, hay que partir de la versión viva antes de aplicar esto.
-- Impacto en el cliente: ninguno (el push solo cambia de texto). Los avisos ya encolados con el texto viejo no se reescriben (la clave anti-duplicado es por
--   persona y día, así que el de hoy, si ya se encoló, sale con el texto viejo).
-- Idempotente: sí.
-- Cómo se revierte: volver a aplicar la función de la 0018.

create or replace function queue_streak_reminder_notifications() returns void as $$
  with today as (
    select (now() at time zone 'America/La_Paz')::date as d
  ),
  hit as (
    select s.user_id, s.day,
           s.day - (row_number() over (partition by s.user_id order by s.day))::int as grp
    from steps_daily s
    join profiles p on p.id = s.user_id
    where s.steps >= p.daily_goal
      and s.day < (select d from today)
      and s.day >= (select d from today) - 60
  ),
  streaks as (
    select user_id, grp, count(*) as len, max(day) as last_day
    from hit group by user_id, grp
  ),
  active as (
    select user_id, len from streaks
    where last_day = (select d from today) - 1 and len >= 2
  )
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select a.user_id,
         '¡No cortes tu racha! 🔥',
         'Llevás ' || a.len || ' días seguidos cumpliendo tu meta. Una caminatita más y la mantenés.',
         jsonb_build_object('type', 'streak_reminder'),
         'streak_reminder:' || a.user_id || ':' || (select d from today)
  from active a
  join profiles p on p.id = a.user_id
  left join steps_daily t on t.user_id = a.user_id and t.day = (select d from today)
  where coalesce(t.steps, 0) < p.daily_goal
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;
