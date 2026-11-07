-- Ruta del mes: cuántas personas participan y números de la ficha de cada local.
-- Además deja escrito en el repo el arreglo del filtro de palabras que ya está en producción ("filtro_permisos").

-- ---------- 1) Filtro de palabras: el disparador corre como dueño ----------
-- Con 0092 el disparador corría con los permisos de la persona, que no puede ejecutar _texto_normalizado():
-- crear un grupo, escribir en el chat del grupo, crear un desafío o editar el perfil daba "permiso denegado" (403).
-- En producción se arregló a mano el 2026-11-06; esto lo deja igual en el repo (no cambia nada si ya está aplicado).
alter function _sin_malas_palabras() security definer;
alter function _sin_malas_palabras() set search_path = public;
alter function texto_ofensivo(text) security definer;
alter function texto_ofensivo(text) set search_path = public;

-- ---------- 2) Cuántas personas participan este mes ----------
-- Solo números (nunca quiénes). Lo ve cualquiera, también la web.
create or replace function route_participation(p_month date default null) returns jsonb as $f$
  select jsonb_build_object(
    'month', m,
    'participants', (select count(*) from route_participants rp where rp.month = m),
    'completed', (select count(*) from route_participants rp where rp.month = m and rp.completed_at is not null))
  from (select coalesce(p_month, route_month()) as m) q;
$f$ language sql stable security definer set search_path = public;

revoke execute on function route_participation(date) from public;
grant execute on function route_participation(date) to anon, authenticated;

-- ---------- 3) Números de la ficha de un local de la Ruta ----------
-- Cuántas personas lo visitaron por la Ruta este mes, cuántas lo conocen por Camina, cuántos Fans tiene
-- y tu nivel ahí. Solo números: no expone a nadie.
create or replace function route_stop_stats(p_business uuid) returns jsonb as $f$
  with lp as (
    select user_id, sum(points)::int pts from business_level_points where business_id = p_business group by user_id
  )
  select jsonb_build_object(
    'ruta_month', (select count(distinct user_id) from route_visits v
                   where v.business_id = p_business and v.month = route_month() and v.status = 'confirmed'),
    'people', (select count(*) from lp where pts > 0),
    'fans', (select count(*) from lp where pts >= 20),
    'my_points', coalesce((select pts from lp where user_id = auth.uid()), 0),
    'my_level', level_name(coalesce((select pts from lp where user_id = auth.uid()), 0)));
$f$ language sql stable security definer set search_path = public;

revoke execute on function route_stop_stats(uuid) from public, anon;
grant execute on function route_stop_stats(uuid) to authenticated;
