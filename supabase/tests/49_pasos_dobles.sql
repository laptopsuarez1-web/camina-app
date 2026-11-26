-- Mapa con eventos y lugares x2 (0133): punto del evento, Empezar/Actualizar/Terminar y topes.
begin;

do $$
declare
  ow uuid; other uuid; b uuid; p promotions; pl uuid; pl2 uuid; u uuid; u2 uuid; res jsonb; sid uuid; n integer;
begin
  -- ===== Punto del evento =====
  perform tt.as_admin();
  ow := tt.mk_user(); other := tt.mk_user();
  insert into businesses (name, category, plan, approved, owner_user_id, account_kind) values ('Local', 'Otros', 'paso_firme', true, ow, 'commerce') returning id into b;
  update businesses set approved = true where id = b;
  perform tt.t_as(ow);
  p := request_promotion_v3(b, 'evento', 'Caminata', 'Todos juntos', null, now() + interval '1 day', now() + interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, '{}', 'Plaza', null, null, null, null);
  perform set_promotion_point(p.id, -21.5355, -64.7296);
  perform tt.t_eq('el dueño marca el punto del evento', (select place_lat from promotions where id = p.id), -21.5355::double precision);
  perform tt.as_client(other);
  perform tt.t_raises('otra persona no puede moverlo', format('select set_promotion_point(%L, 0, 0)', p.id), 'No autorizado');
  perform tt.as_admin();

  -- ===== Lugar x2 =====
  insert into boost_places (name, lat, lng, radius_m, starts_at, ends_at, max_points)
  values ('Shopping Norte', -21.5300, -64.7300, 150, now() - interval '1 day', now() + interval '10 days', 5) returning id into pl;
  insert into boost_places (name, lat, lng, starts_at, ends_at) values ('Futuro', -21.53, -64.73, now() + interval '2 days', now() + interval '5 days') returning id into pl2;

  u := tt.mk_user();
  perform tt.as_client(u);
  perform tt.t_eq('la persona ve los lugares vigentes y próximos', (select count(*)::int from boost_places_for_me()), 2);
  perform tt.t_raises('nadie fuera del equipo crea lugares', $q$insert into boost_places (name, lat, lng, starts_at, ends_at) values ('X', 0, 0, now(), now() + interval '1 day')$q$, 'row-level security');

  res := boost_start(pl, -21.5400, -64.7400);
  perform tt.t_eq('lejos: no empieza', res->>'reason', 'lejos');
  res := boost_start(pl, null, null);
  perform tt.t_eq('sin ubicación: no empieza', res->>'reason', 'sin_ubicacion');
  res := boost_start(pl2, -21.5300, -64.7300);
  perform tt.t_eq('antes de las fechas: no empieza', res->>'reason', 'no_empezo');

  res := boost_start(pl, -21.5301, -64.7301);
  perform tt.t_eq('adentro: empieza', (res->>'ok')::boolean, true);
  sid := (res->'session'->>'id')::uuid;

  -- Simula que empezó hace 30 minutos (como superusuario).
  perform tt.as_admin();
  update boost_sessions set started_at = now() - interval '30 minutes', last_inside_at = now() - interval '30 minutes' where id = sid;
  perform tt.as_client(u);

  res := boost_update(sid, -21.5301, -64.7301, 3500, false);
  perform tt.t_eq('3.500 pasos adentro: 3 Puntos extra', (res->'session'->>'points')::int, 3);
  perform tt.t_eq('sigue abierta', res->'session'->>'ended_at', null);
  perform tt.t_eq('van al saldo', user_points_balance(u), 3);
  perform tt.t_eq('van aparte de los Puntos por pasos', tt.steps_pts(u, local_today()), 0);

  res := boost_update(sid, -21.5301, -64.7301, 999999, false);
  perform tt.t_eq('pasos imposibles para 30 min: se recortan (máx 200/min = 6.000)', (res->'session'->>'steps')::int, 6000);
  perform tt.t_eq('y respeta el tope del lugar (5)', (res->'session'->>'points')::int, 5);

  res := boost_update(sid, -21.5301, -64.7301, 100, false);
  perform tt.t_eq('los pasos no bajan', (res->'session'->>'steps')::int, 6000);

  res := boost_update(sid, -21.6000, -64.8000, 9000, false);
  perform tt.t_eq('afuera: se cierra', res->'session'->>'ended_at' is not null, true);
  perform tt.t_eq('lo ganado se queda', user_points_balance(u), 5);
  select count(*) into n from points_ledger where user_id = u and note = 'Pasos dobles: Shopping Norte';
  perform tt.t_true('queda en el historial como Pasos dobles', n >= 1);

  res := boost_start(pl, -21.5301, -64.7301);
  perform tt.t_eq('con el tope lleno no vuelve a empezar', res->>'reason', 'tope');

  -- Otra persona no puede tocar la sesión ajena.
  perform tt.as_admin();
  u2 := tt.mk_user();
  perform tt.as_client(u2);
  perform tt.t_raises('sesión ajena: no', format('select boost_update(%L, -21.5301, -64.7301, 100, true)', sid), 'No autorizado');
  perform tt.t_eq('no ve sesiones ajenas', (select count(*)::int from boost_sessions), 0);
  perform tt.t_raises('no puede escribir sesiones a mano', format('update boost_sessions set points = 99 where id = %L', sid), 'permission denied');
  perform tt.as_admin();
end $$;

rollback;
