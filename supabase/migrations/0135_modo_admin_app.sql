-- Modo admin dentro de la app para las cuentas de app_admins (la bandera vive en la base; la app solo pregunta is_admin()).
-- Para un admin:
--  · canjear sin espera entre canjes, sin tope de cupos y sin "solo primera visita" (igual que una cuenta qa_accounts);
--    la distancia al local ya la salta distance_m() desde 0096.
--  · subir historia de un canje aunque hayan pasado más de 7 días.
--  · reiniciar su propia Ruta del mes cuando quiera (admin_route_reset).
--  · poner una imagen propia en la insignia de un local (businesses.badge_image_url; user_badges la usa en vez del logo).
-- Para el resto de las personas no cambia nada. Cómo se revierte: quitar la columna y las funciones nuevas, y volver a correr
-- redeem_benefit, redeem_with_local_code, check_new_customers_only, submit_story_share y user_badges de sus migraciones.

alter table public.businesses add column if not exists badge_image_url text;

-- Reescribe una función cambiando un texto por otro (una sola vez). Avisa si no encontró el texto.
create or replace function pg_temp.parchar(p_fn regprocedure, p_old text, p_new text) returns void
language plpgsql as $f$
declare v_def text;
begin
  v_def := pg_get_functiondef(p_fn);
  if position(p_new in v_def) > 0 then
    raise notice '% ya tiene el cambio', p_fn;
    return;
  end if;
  if position(p_old in v_def) = 0 then
    raise exception 'No encontré el texto a cambiar en %', p_fn;
  end if;
  execute replace(v_def, p_old, p_new);
end;
$f$;

select pg_temp.parchar('public.redeem_benefit(uuid)'::regprocedure,
  'v_qa := exists (select 1 from qa_accounts where user_id = v_user);',
  'v_qa := exists (select 1 from qa_accounts where user_id = v_user) or is_admin();');

select pg_temp.parchar('public.redeem_with_local_code(uuid, text, double precision, double precision)'::regprocedure,
  'not exists (select 1 from qa_accounts where user_id = v_user)',
  'not (exists (select 1 from qa_accounts where user_id = v_user) or is_admin())');

select pg_temp.parchar('public.check_new_customers_only()'::regprocedure,
  'and not exists (select 1 from public.qa_accounts q where q.user_id = new.user_id)',
  'and not (exists (select 1 from public.qa_accounts q where q.user_id = new.user_id) or public.is_admin())');

select pg_temp.parchar('public.submit_story_share(uuid, text, text)'::regprocedure,
  'if r.confirmed_at < now() - (story_window_days()',
  'if not is_admin() and r.confirmed_at < now() - (story_window_days()');

select pg_temp.parchar('public.user_badges(uuid)'::regprocedure,
  '''logo_url'', b.logo_url',
  '''logo_url'', coalesce(b.badge_image_url, b.logo_url)');

-- Reiniciar mi Ruta de este mes (solo admin): borra mis locales y visitas del mes y la deja sin participar.
create or replace function public.admin_route_reset() returns jsonb
language plpgsql security definer set search_path = public
as $f$
begin
  if auth.uid() is null or not is_admin() then
    raise exception 'No autorizado';
  end if;
  delete from route_visits where user_id = auth.uid() and month = route_month();
  delete from route_stops where user_id = auth.uid() and month = route_month();
  delete from route_participants where user_id = auth.uid() and month = route_month();
  return route_state();
end;
$f$;
revoke execute on function public.admin_route_reset() from public, anon;
grant execute on function public.admin_route_reset() to authenticated;
