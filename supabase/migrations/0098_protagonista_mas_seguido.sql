-- El local protagonista del mes (el que regala el premio del sorteo de la Ruta) sale más seguido en las rutas nuevas,
-- pero no siempre: pesa 3 veces más que los demás al sortear los 3 locales de cada persona.
-- Sorteo con peso (Efraimidis–Spirakis): cada local recibe la llave -ln(azar) / peso y se toman las 3 llaves más chicas.
-- Con 20 locales: un local común sale en ~15% de las rutas y el protagonista en ~40%.
create or replace function route_join() returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_star uuid := (select sponsor_business_id from route_prizes where month = route_month());
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  if exists (select 1 from route_participants where user_id = v_user and month = v_month) then
    return route_state();
  end if;
  if (select count(*) from businesses b where route_eligible(b.id)) < 3 then
    raise exception 'Todavía no hay suficientes locales para la Ruta de este mes.';
  end if;
  insert into route_participants (user_id, month) values (v_user, v_month);
  insert into route_stops (user_id, month, business_id)
  select v_user, v_month, b.id from businesses b where route_eligible(b.id)
  order by -ln(greatest(random(), 1e-12)) / (case when b.id = v_star then 3.0 else 1.0 end)
  limit 3;
  return route_state();
end;
$f$ language plpgsql security definer set search_path = public;

revoke execute on function route_join() from public, anon;
grant execute on function route_join() to authenticated;
