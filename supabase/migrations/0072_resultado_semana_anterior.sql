-- 0072 — Mi puesto en el ranking global de la SEMANA ANTERIOR (solo lectura).
-- Para qué: la app muestra una escena de festejo (1.º, podio, Top 10 o Top 100) el primer día de la semana nueva.
-- Qué hace: my_last_week_rank() devuelve (rank_position, total_steps) de la semana cerrada (lunes a domingo), con las mismas
--   reglas que my_weekly_rank (0056): solo si aparezco en el ranking (ranking_visible) y sumé pasos. No entrega Puntos ni
--   cambia datos: el premio en Puntos se agrega aparte, cuando se decida cuánto es.
-- Idempotente: sí (create or replace).
-- Cómo se revierte: drop function my_last_week_rank();

create or replace function my_last_week_rank() returns table (rank_position bigint, total_steps bigint) as $f$
  with w as (
    select (date_trunc('week', local_today())::date - 7) as a, date_trunc('week', local_today())::date as b
  ),
  mine as (
    select coalesce(sum(s.steps), 0)::bigint as total
    from steps_daily s, w
    where s.user_id = auth.uid() and s.day >= w.a and s.day < w.b
  )
  select 1 + (
           select count(*) from (
             select s.user_id from steps_daily s
             join profiles p on p.id = s.user_id, w
             where p.ranking_visible = true and s.day >= w.a and s.day < w.b
             group by s.user_id having sum(s.steps) > (select total from mine)
           ) above
         ),
         mine.total
  from mine
  where auth.uid() is not null
    and mine.total > 0
    and coalesce((select ranking_visible from profiles where id = auth.uid()), false);
$f$ language sql stable security definer set search_path = public;

revoke execute on function my_last_week_rank() from public, anon;
grant execute on function my_last_week_rank() to authenticated;
