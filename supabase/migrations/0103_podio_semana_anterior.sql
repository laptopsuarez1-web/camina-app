-- Podio (1.º a 3.º) del ranking global de la semana que cerró, para la escena "Subiste al podio": así se ven las fotos
-- y los nombres de los otros dos del podio, no lugares vacíos. Mismas reglas que global_weekly_ranking: solo quien tiene
-- "Aparecer en el ranking" encendido y sin bloqueos entre la persona y quien pregunta.
-- Cómo se revierte: drop function last_week_podium();

create or replace function last_week_podium() returns table (user_id uuid, full_name text, photo_url text, total_steps bigint) as $f$
  with w as (
    select (date_trunc('week', local_today())::date - 7) as a, date_trunc('week', local_today())::date as b
  )
  select p.id, p.full_name, p.photo_url, sum(s.steps)::bigint as total_steps
  from profiles p
  join steps_daily s on s.user_id = p.id, w
  where p.ranking_visible = true
    and s.day >= w.a and s.day < w.b
    and (p.id = auth.uid() or not users_blocked(auth.uid(), p.id))
  group by p.id, p.full_name, p.photo_url
  having sum(s.steps) > 0
  order by total_steps desc
  limit 3;
$f$ language sql stable security definer set search_path = public;

revoke execute on function last_week_podium() from public, anon;
grant execute on function last_week_podium() to authenticated;
