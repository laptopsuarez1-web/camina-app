-- 0098: el local protagonista (regala el premio del sorteo) sale más seguido en las rutas, pero no en todas.
begin;

do $$
declare
  owner uuid; star uuid; b uuid; u uuid; i int; hits int := 0; common int := 0; other uuid;
begin
  update businesses set route_opt_out = true;
  owner := tt.mk_user();
  for i in 1..10 loop
    b := gen_random_uuid();
    insert into businesses (id, name, category, plan, approved, lat, lng, owner_user_id)
    values (b, 'Local ' || i, 'Café', 'paso_firme', true, -21.5340, -64.7370, owner);
    update businesses set approved = true where id = b;
    if i = 1 then star := b; end if;
    if i = 2 then other := b; end if;
  end loop;
  insert into route_prizes (month, title, sponsor_business_id) values (route_month(), 'Premio de prueba', star);

  for i in 1..300 loop
    u := tt.mk_user();
    perform tt.t_as(u);
    perform route_join();
    perform tt.as_admin();
  end loop;
  select count(*) into hits from route_stops where month = route_month() and business_id = star;
  select count(*) into common from route_stops where month = route_month() and business_id = other;
  -- Con 10 locales y peso 3: el protagonista sale en ~60% de las rutas; uno común en ~27%.
  perform tt.t_true(format('el protagonista sale más seguido (%s de 300 contra %s de un local común)', hits, common), hits > common * 1.5);
  perform tt.t_true(format('pero no en todas las rutas (%s de 300)', hits), hits < 285);
  perform tt.t_eq('cada ruta sigue teniendo 3 locales distintos',
    (select count(*) from (select user_id from route_stops where month = route_month() group by user_id having count(distinct business_id) <> 3) x)::int, 0);
end $$;

rollback;
