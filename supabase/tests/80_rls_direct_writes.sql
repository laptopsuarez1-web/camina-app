-- Lo que una persona logueada puede escribir DIRECTO en las tablas (RLS), saltándose las funciones del servidor.
-- Los Puntos solo deberían nacer de earn_points_from_steps / claim_reto / settle / referidos, y todas esas reglas
-- leen steps_daily: si el cliente puede escribir ahí a mano, la antitrampa (0038) no sirve.
begin;

do $$
declare
  u uuid; v uuid; today date := local_today(); n integer; st integer; ok boolean;
  b uuid; red redemptions;
begin
  u := tt.mk_user(); v := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 10, 60);

  perform tt.as_client(u);
  -- Lo que SÍ está cerrado:
  perform tt.t_raises('no se puede insertar a mano en points_ledger', format('insert into points_ledger (user_id, amount, reason) values (%L, 999, ''steps'')', u), 'row-level security');
  perform tt.t_raises('no se puede inventar un canje a mano', format('insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at) select %L, id, business_id, 1, ''000000'', now() from benefits limit 1', u), 'row-level security');
  perform tt.t_raises('no se puede inventar un cobro de reto a mano', format('insert into reto_claims (reto_id, user_id, period, points) select id, %L, ''x'', 100 from retos limit 1', u), 'row-level security');
  -- UPDATE/DELETE sin policy: RLS filtra todas las filas, no falla pero no toca nada.
  update points_ledger set amount = 9999 where user_id = u;
  delete from points_ledger where user_id = u;
  perform tt.as_admin();
  perform tt.t_eq('los asientos de Puntos no se pueden editar ni borrar a mano', user_points_balance(u), 10);

  perform tt.as_client(u);
  select count(*) into n from steps_daily where user_id = v;
  perform tt.t_eq('no se ven los pasos de otra persona', n, 0);
  perform tt.as_admin();

  -- BUG: steps_daily tiene policies de INSERT y UPDATE "propias" (0001) que nunca se cerraron.
  -- Con eso se escribe cualquier cantidad (hasta el recorte de 60.000 del trigger) sin pasar por earn_points_from_steps,
  -- se salta la plausibilidad de 0038 y se alimentan desafíos, retos, rankings y rachas.
  perform tt.as_client(u);
  begin
    insert into steps_daily (user_id, day, steps) values (u, today, 60000);
    ok := true;
  exception when others then ok := false;
  end;
  perform tt.as_admin();
  perform tt.t_xfail_true('un cliente no debería poder insertar pasos directo en steps_daily', not ok, 'insert propio permitido por la policy "steps: upsert own"');
  if ok then
    perform tt.as_client(u);
    update steps_daily set steps = 60000 where user_id = u and day = today;
    perform tt.as_admin();
    select steps into st from steps_daily where user_id = u and day = today;
    perform tt.t_xfail_true('un cliente no debería poder actualizar pasos directo en steps_daily', st <> 60000, format('pasos guardados = %s', st));
    -- Y encima earn_points_from_steps se apoya en ese valor: el "máximo permitido" parte de los pasos ya guardados.
    perform tt.t_as(u);
    perform earn_points_from_steps(u, today, 60000);
    perform tt.t_xfail_eq('caminando 0 pasos, dos llamadas alcanzan el tope de 20 Puntos del día', tt.steps_pts(u, today), 0);
  end if;

  -- La meta del día también se puede escribir a mano (columna goal): sirve para "cumplir" días pasados en rachas y calendario.
  u := tt.mk_user(6000);
  perform tt.as_client(u);
  begin
    insert into steps_daily (user_id, day, steps, goal) values (u, today - 1, 10, 1000);
    ok := true;
  exception when others then ok := false;
  end;
  perform tt.as_admin();
  perform tt.t_xfail_true('un cliente no debería poder fijar a mano la meta de un día (steps_daily.goal)', not ok, 'goal=1000 con 10 pasos queda como día "cumplido" en el cliente');
end $$;

rollback;
