-- Premio del sorteo de la Ruta (0089).
begin;

do $$
declare
  adm uuid; u1 uuid; u2 uuid; u3 uuid; past date; cur date; res jsonb;
begin
  adm := tt.mk_user(); insert into app_admins (user_id) values (adm);
  u1 := tt.mk_user(6000, 'Daniela Ríos'); u2 := tt.mk_user(6000, 'Pedro'); u3 := tt.mk_user(6000, 'Sin Boleto');
  cur := route_month();
  past := (cur - interval '1 month')::date;
  insert into route_participants (user_id, month, completed_at, ticket_no) values (u1, past, now(), 101), (u2, past, now(), 102);
  insert into route_participants (user_id, month) values (u3, past);

  perform tt.t_eq('sin premio cargado no hay nada', route_prize(past), null::jsonb);
  perform tt.t_eq('nombre corto', short_name('Daniela Ríos'), 'Daniela R.');

  -- Solo el admin carga el premio.
  perform tt.as_client(u1);
  perform tt.t_raises('una persona no puede cargar el premio',
    format('insert into route_prizes (month, title) values (%L, %L)', past, 'Algo'), 'row-level security');
  perform tt.as_client(adm);
  insert into route_prizes (month, title, detail, winners_count) values (past, 'Premio de prueba', 'Detalle', 5);
  insert into route_prizes (month, title) values (cur, 'Premio de este mes');

  -- Cualquier persona con sesión lo ve.
  perform tt.as_client(u3);
  res := route_prize(past);
  perform tt.t_eq('cualquier persona ve el premio', res->>'title', 'Premio de prueba');
  perform tt.t_eq('cuenta los boletos', (res->>'tickets')::int, 2);
  perform tt.as_admin();

  -- Sorteo.
  perform tt.as_client(u1);
  perform tt.t_raises('una persona no puede sortear', format('select route_draw(%L)', past), 'No autorizado');
  perform tt.as_client(adm);
  perform tt.t_raises('el mes actual todavía no se sortea', format('select route_draw(%L)', cur), 'cuando termina el mes');
  res := route_draw(past);
  perform tt.t_eq('salen solo quienes tienen boleto (2, aunque pidió 5)', jsonb_array_length(res->'winners'), 2);
  perform tt.t_true('nadie sin boleto gana', not (res::text like '%Sin Boleto%' or res::text like '%Sin B.%'));
  perform tt.t_true('los ganadores se ven con nombre corto', res::text like '%Daniela R.%');
  perform tt.t_true('no expone ids', not (res::text like '%' || u1 || '%'));
  perform tt.t_raises('no se sortea dos veces', format('select route_draw(%L)', past), 'ya se hizo');
  perform tt.as_admin();
  perform tt.t_true('avisa a los ganadores', exists (select 1 from notifications_outbox where user_id = u1 and title like '%Ganaste el sorteo%'));
  perform tt.t_true('no avisa a quien no tenía boleto', not exists (select 1 from notifications_outbox where user_id = u3 and title like '%Ganaste el sorteo%'));
end $$;

rollback;
