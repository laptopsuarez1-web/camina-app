-- Ruta del mes (0084): 2 cambios para quien completó el mes pasado y rubros que no entran.
begin;

do $$
declare
  u uuid; owner uuid; b uuid; gym uuid; st jsonb; stops uuid[]; opts jsonb; cur date;
begin
  update businesses set route_opt_out = true;
  owner := tt.mk_user();
  for i in 1..5 loop
    b := gen_random_uuid();
    insert into businesses (id, name, category, plan, approved, lat, lng, owner_user_id)
    values (b, 'Local ' || i, 'Café', 'paso_firme', true, -21.534, -64.737, owner);
    update businesses set approved = true where id = b;
  end loop;
  gym := gen_random_uuid();
  insert into businesses (id, name, category, plan, approved, lat, lng, owner_user_id)
  values (gym, 'Gym prueba', 'Gimnasio & Deporte', 'paso_firme', true, -21.534, -64.737, owner);
  update businesses set approved = true where id = gym;
  b := gen_random_uuid();
  insert into businesses (id, name, category, plan, approved, lat, lng, owner_user_id)
  values (b, 'Cancheritos Prueba', 'Café', 'paso_firme', true, -21.534, -64.737, owner);
  update businesses set approved = true, route_opt_out = false where id = b;

  perform tt.t_eq('un gimnasio no entra a la ruta', route_eligible(gym), false);
  perform tt.t_eq('una tienda online no entra', route_excluded_category('Tienda Online'), true);
  perform tt.t_eq('un café sí entra', route_excluded_category('Café'), false);
  perform tt.t_eq('sin categoría sí entra', route_excluded_category(null), false);

  -- Sin ruta completa el mes pasado: 1 cambio.
  u := tt.mk_user(); perform tt.t_as(u);
  st := route_join();
  perform tt.t_eq('sin ruta previa: 1 cambio', (st->>'swaps_left')::int, 1);
  select array_agg((x->>'business_id')::uuid) into stops from jsonb_array_elements(st->'stops') x;
  opts := route_swap_options();
  perform tt.t_eq('el gimnasio no aparece para cambiar', (select count(*) from jsonb_array_elements(opts) x where (x->>'business_id')::uuid = gym)::int, 0);

  -- Con la ruta del mes pasado completa: 2 cambios.
  perform tt.as_admin();
  cur := route_month();
  u := tt.mk_user();
  insert into route_participants (user_id, month, completed_at) values (u, (cur - interval '1 month')::date, now() - interval '20 days');
  perform tt.t_as(u);
  st := route_join();
  perform tt.t_eq('con ruta previa completa: 2 cambios', (st->>'swaps_left')::int, 2);
  perform tt.t_eq('sabe que tiene 2 en total', (st->>'swaps_total')::int, 2);
  select array_agg((x->>'business_id')::uuid) into stops from jsonb_array_elements(st->'stops') x;
  st := route_swap(stops[1], (route_swap_options()->0->>'business_id')::uuid);
  perform tt.t_eq('tras el primer cambio le queda 1', (st->>'swaps_left')::int, 1);
  st := route_swap(stops[2], (route_swap_options()->0->>'business_id')::uuid);
  perform tt.t_eq('tras el segundo, 0', (st->>'swaps_left')::int, 0);
  perform tt.t_raises('no hay tercer cambio', format('select route_swap(%L, %L)', stops[3], stops[1]), 'Ya usaste');
end $$;

rollback;
