-- Ruta del mes (0082): 3 locales al azar, 1 cambio, visita con código del local, el local confirma, Día doble.
begin;

do $$
declare
  u uuid; u2 uuid; owner uuid; b1 uuid; b2 uuid; b3 uuid; b4 uuid; st jsonb; res jsonb;
  stops uuid[]; outb uuid; inb uuid; code text; vid uuid; n integer; prev date;
begin
  -- Solo los locales de esta prueba participan.
  update businesses set route_opt_out = true;

  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.t_raises('con menos de 3 locales no se puede participar', 'select route_join()', 'suficientes locales');
  perform tt.as_admin();

  owner := tt.mk_user();
  foreach b1 in array array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()] loop
    insert into businesses (id, name, category, plan, approved, lat, lng, owner_user_id)
    values (b1, 'Local ' || left(b1::text, 4), 'Café', 'paso_firme', true, -21.5340, -64.7370, owner);
    update businesses set approved = true where id = b1;  -- las altas nacen sin aprobar (0014)
  end loop;
  perform tt.t_eq('los 4 locales nuevos tienen código', (select count(*) from business_local_codes c join businesses b on b.id = c.business_id where not b.route_opt_out)::int, 4);

  -- ===== Participar =====
  perform tt.t_as(u);
  st := route_join();
  perform tt.t_eq('al participar le tocan 3 locales', jsonb_array_length(st->'stops'), 3);
  perform tt.t_eq('queda anotada', (st->>'joined')::boolean, true);
  perform tt.t_eq('participar de nuevo no cambia la ruta', route_join()->'stops', st->'stops');
  select array_agg((x->>'business_id')::uuid) into stops from jsonb_array_elements(st->'stops') x;
  perform tt.t_eq('le queda 1 local para elegir al cambiar', jsonb_array_length(route_swap_options()), 1);

  -- ===== Cambiar 1 local =====
  outb := stops[1];
  inb := (route_swap_options()->0->>'business_id')::uuid;
  st := route_swap(outb, inb);
  perform tt.t_eq('el cambio deja 3 locales', jsonb_array_length(st->'stops'), 3);
  perform tt.t_eq('ya no le quedan cambios', (st->>'swaps_left')::int, 0);
  perform tt.t_raises('solo 1 cambio por mes', format('select route_swap(%L, %L)', stops[2], outb), 'Ya usaste');
  select array_agg((x->>'business_id')::uuid) into stops from jsonb_array_elements(st->'stops') x;

  -- ===== Marcar visita =====
  perform tt.as_admin();
  select c.code into code from business_local_codes c where c.business_id = stops[1];
  perform tt.t_as(u);
  res := route_mark_visit(stops[1], code, -21.80, -64.90);
  perform tt.t_eq('lejos del local: no cuenta', res->>'reason', 'lejos');
  res := route_mark_visit(stops[1], 'xxxx', -21.5341, -64.7371);
  perform tt.t_eq('código incorrecto: no cuenta', res->>'reason', 'codigo_incorrecto');
  res := route_mark_visit(outb, code, -21.5341, -64.7371);
  perform tt.t_eq('un local fuera de su ruta no cuenta', res->>'reason', 'no_en_ruta');
  res := route_mark_visit(stops[1], code, -21.5341, -64.7371);
  perform tt.t_eq('código correcto y cerca: queda pendiente', (res->>'ok')::boolean, true);
  res := route_mark_visit(stops[1], code, -21.5341, -64.7371);
  perform tt.t_eq('no se marca dos veces el mismo local', res->>'reason', 'ya_marcada');
  perform tt.t_raises('un local visitado ya no se puede cambiar', format('select route_swap(%L, %L)', stops[1], outb), 'Ya usaste');

  -- ===== El local confirma =====
  select id into vid from route_visits where user_id = u and business_id = stops[1];
  perform tt.t_raises('la persona no puede confirmarse sola', format('select route_decide_visit(%L, true)', vid), 'No autorizado');
  perform tt.t_as(owner);
  perform tt.t_eq('el local ve la visita pendiente', (route_business_visits(stops[1])->'visits'->0->>'status'), 'pending');
  res := route_decide_visit(vid, false);
  perform tt.t_eq('No compró: queda rechazada', res->>'status', 'rejected');
  perform tt.t_raises('no se revisa dos veces', format('select route_decide_visit(%L, true)', vid), 'ya fue revisada');

  -- Vuelve a marcar y esta vez compró; después los otros 2.
  perform tt.t_as(u);
  res := route_mark_visit(stops[1], code, -21.5341, -64.7371);
  perform tt.t_eq('después de un rechazo puede volver a marcar', (res->>'ok')::boolean, true);
  for n in 2..3 loop
    perform tt.as_admin();
    select c.code into code from business_local_codes c where c.business_id = stops[n];
    perform tt.t_as(u);
    perform route_mark_visit(stops[n], code, -21.5341, -64.7371);
  end loop;
  perform tt.t_as(owner);
  for vid in select id from route_visits where user_id = u and status = 'pending' order by created_at loop
    res := route_decide_visit(vid, true);
  end loop;
  perform tt.t_eq('la tercera confirmación completa la ruta', (res->>'done')::int, 3);
  perform tt.as_admin();
  perform tt.t_true('queda con fecha de completada y boleto',
    exists (select 1 from route_participants where user_id = u and completed_at is not null and ticket_no is not null));
  perform tt.t_true('le llega el aviso', exists (select 1 from notifications_outbox where user_id = u and title like '%Completaste%'));
  perform tt.t_eq('no se usaron Puntos', user_points_balance(u), 0);

  -- ===== Día doble =====
  u2 := tt.mk_user();
  prev := (route_month() - interval '1 month')::date;
  insert into route_participants (user_id, month, completed_at, ticket_no) values (u2, prev, now(), 999);
  perform tt.t_as(u2);
  perform tt.t_raises('no se elige un día de otro mes', format('select route_pick_double_day(%L)', (route_month() + interval '1 month')::date), 'Elige un día');
  st := route_pick_double_day(local_today());
  perform tt.t_eq('elige hoy como Día doble', (st->>'double_day')::date, local_today());
  perform tt.as_admin();
  perform tt.seed_steps(u2, local_today(), 0, 1200);
  perform tt.t_as(u2);
  perform earn_points_from_steps(u2, local_today(), 15000);
  perform tt.t_eq('en su Día doble 15.000 pasos dan 30 Puntos', tt.steps_pts(u2, local_today()), 30);
  perform earn_points_from_steps(u2, local_today(), 30000);
  perform tt.t_eq('el tope ese día es 40', tt.steps_pts(u2, local_today()), 40);

  u := tt.mk_user();
  perform tt.as_admin(); perform tt.seed_steps(u, local_today(), 0, 1200); perform tt.t_as(u);
  perform earn_points_from_steps(u, local_today(), 15000);
  perform tt.t_eq('un día normal 15.000 pasos dan 15 Puntos', tt.steps_pts(u, local_today()), 15);
  perform tt.t_raises('sin ruta completada no hay Día doble', format('select route_pick_double_day(%L)', local_today()), 'se gana completando');
  perform tt.as_admin();
end $$;

rollback;
