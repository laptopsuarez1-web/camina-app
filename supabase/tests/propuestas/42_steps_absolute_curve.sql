-- PROPUESTA 0042 (SEC-03 B): repetir llamadas a earn_points_from_steps ya no suma margen; la curva depende solo de la hora.
-- Sin la propuesta: "10 llamadas seguidas" falla (cada llamada suma otros +2.000 pasos) y no existen los ayudantes de la curva.
-- Las comprobaciones que dependen de la hora usan la misma fórmula (steps_allowed_at) para no variar según cuándo se corra la prueba.
begin;

do $$
declare
  u uuid; u2 uuid; today date := local_today(); ytd date := local_today() - 1; st integer; st1 integer; allowed integer; i integer;
  hay boolean := to_regprocedure('public.steps_allowed_at(date,timestamptz)') is not null;
  d date := date '2026-03-10';
begin
  u := tt.mk_user(6000); perform tt.seed_steps(u, today, 0, 1);       -- 0 pasos, última sincronización hace 1 minuto

  -- ===== El ataque: 10 llamadas seguidas =====
  perform tt.t_as(u);
  perform earn_points_from_steps(u, today, 100000);
  select steps into st1 from steps_daily where user_id = u and day = today;
  for i in 2..10 loop perform earn_points_from_steps(u, today, 100000); end loop;
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('10 llamadas seguidas guardan lo mismo que la primera (no suman margen)', st, st1);
  if hay then
    allowed := steps_allowed_at(today, now());
    perform tt.t_eq('... y eso es exactamente lo que permite la curva de la hora (con el recorte de 60.000)', st, least(allowed, 60000));
    perform tt.t_eq('... los Puntos corresponden a eso (1 cada 1.000, tope 20)', tt.steps_pts(u, today), least(st / 1000, 20));
  else
    perform tt.t_fail('existe steps_allowed_at(date, timestamptz)', 'no existe: no hay curva absoluta');
  end if;
  perform tt.as_admin();
  if not hay then return; end if;

  -- ===== La curva (con momentos fijos, no depende de la hora de la prueba) =====
  perform tt.t_eq('a medianoche de La Paz: solo el margen de 2.000', steps_allowed_at(d, (d::timestamp at time zone 'America/La_Paz')), 2000);
  perform tt.t_eq('antes de empezar el día: 2.000 (nunca negativo)', steps_allowed_at(d, (d::timestamp at time zone 'America/La_Paz') - interval '5 hours'), 2000);
  perform tt.t_eq('a la 1:00 con 300/min: 2.000 + 60 * 300 = 20.000', steps_allowed_at(d, (d::timestamp at time zone 'America/La_Paz') + interval '1 hour'), 20000);
  perform tt.t_eq('a las 12:00 llega al tope de 100.000', steps_allowed_at(d, (d::timestamp at time zone 'America/La_Paz') + interval '12 hours'), 100000);
  perform tt.t_eq('sincronizar ayer (p_day) ya a las 00:05 de hoy: las 24 h completas, tope 100.000', steps_allowed_at(d - 1, (d::timestamp at time zone 'America/La_Paz') + interval '5 minutes'), 100000);
  perform tt.t_eq('la tasa vive en un solo lugar: steps_max_per_minute() = 300', steps_max_per_minute(), 300);

  -- ===== Permisos de los ayudantes =====
  perform tt.t_true('authenticated NO puede ejecutar steps_allowed_at', not has_function_privilege('authenticated', 'public.steps_allowed_at(date,timestamptz)', 'execute'));
  perform tt.t_true('authenticated NO puede ejecutar steps_max_per_minute', not has_function_privilege('authenticated', 'public.steps_max_per_minute()', 'execute'));
  perform tt.t_true('anon NO puede ejecutar steps_allowed_at', not has_function_privilege('anon', 'public.steps_allowed_at(date,timestamptz)', 'execute'));

  -- ===== Lo legítimo sigue andando =====
  u2 := tt.mk_user(6000); perform tt.seed_steps(u2, today, 0); perform tt.t_as(u2);
  perform earn_points_from_steps(u2, today, 2000);
  perform tt.t_eq('una sincronización normal (2.000 pasos) acredita lo que corresponde', tt.steps_pts(u2, today), least(2, steps_allowed_at(today, now()) / 1000));
  perform earn_points_from_steps(u2, ytd, 25000);
  perform tt.t_eq('ayer: 25.000 pasos dan 20 Puntos (tope diario)', tt.steps_pts(u2, ytd), 20);
  perform tt.as_client(u2);
  perform tt.t_eq('también por el rol real de la app (authenticated) sigue funcionando', earn_points_from_steps(u2, today, 2500) >= 20, true);
  perform tt.t_raises('un día futuro sigue rechazado', format('select earn_points_from_steps(%L, %L, 1000)', u2, today + 1), 'Fecha de sincronización inválida');
  perform tt.t_raises('un día de hace 2 días sigue rechazado', format('select earn_points_from_steps(%L, %L, 1000)', u2, today - 2), 'Fecha de sincronización inválida');
  perform tt.t_raises('pasos de otra persona siguen rechazados', format('select earn_points_from_steps(%L, %L, 1000)', u, today), 'No autorizado');
  perform tt.as_admin();
  perform tt.t_eq('el recorte silencioso a 100.000/60.000 sigue: 150.000 pasos nunca superan 60.000 guardados', (select max(steps) from steps_daily where user_id = u2), least(25000, 60000));
  perform tt.t_eq('la meta del día se sigue guardando (0039)', (select goal from steps_daily where user_id = u2 and day = today), 6000);
end $$;

rollback;
