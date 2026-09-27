-- Consentimiento legal obligatorio (Apple/Google lo exigen para apps que
-- piden datos de salud): se marca la primera vez que el usuario acepta
-- Términos y Privacidad, ver app/(auth)/terminos.tsx.
alter table profiles add column terms_accepted_at timestamptz;

-- ---------- RANKING GLOBAL Y PROMEDIO DE LA COMUNIDAD ----------
-- steps_daily es select-own (nadie puede leer los pasos de otro directo), así
-- que un ranking entre TODOS los usuarios de Camina (no solo los de tu grupo)
-- necesita una función security definer que agregue del lado del servidor y
-- solo devuelva lo mínimo: nombre/foto de quienes aceptaron aparecer en
-- rankings (profiles.ranking_visible) y su total de pasos de la semana.
create or replace function global_weekly_ranking(p_limit integer default 20)
returns table (user_id uuid, full_name text, photo_url text, total_steps bigint) as $$
  select
    p.id,
    p.full_name,
    p.photo_url,
    coalesce(sum(s.steps), 0)::bigint as total_steps
  from profiles p
  left join steps_daily s
    on s.user_id = p.id
    and s.day >= date_trunc('week', local_today())::date
  where p.ranking_visible = true
  group by p.id, p.full_name, p.photo_url
  having coalesce(sum(s.steps), 0) > 0
  order by total_steps desc
  limit greatest(1, least(p_limit, 100));
$$ language sql stable security definer set search_path = public;

grant execute on function global_weekly_ranking(integer) to authenticated;

-- Promedio real de pasos semanales por usuario activo, entre TODOS los
-- usuarios de Camina (incluso los que no aparecen en el ranking) — no expone
-- identidades, solo un número, para comparaciones tipo "caminás más que el
-- promedio de la comunidad".
create or replace function community_weekly_average() returns numeric as $$
  select coalesce(avg(total), 0)
  from (
    select user_id, sum(steps) as total
    from steps_daily
    where day >= date_trunc('week', local_today())::date
    group by user_id
  ) totals;
$$ language sql stable security definer set search_path = public;

grant execute on function community_weekly_average() to authenticated;
