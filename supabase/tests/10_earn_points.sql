-- earn_points_from_steps (migraciones 0003, 0038, 0039): 1 Punto cada 1.000 pasos, tope de 20 por día,
-- fechas válidas, idempotencia, plausibilidad (0038), meta de cada día (0039) y crédito por referido (0033).
begin;

do $$
declare
  u uuid; u2 uuid; today date := local_today(); ytd date := local_today() - 1;
  bal integer; st integer; n integer; r record; i integer;
begin
  -- ===== 1 Punto cada 1.000 pasos (se redondea hacia abajo) =====
  foreach st in array array[0, 999, 1000, 1999, 2000, 5500] loop
    u := tt.mk_user(); perform tt.t_as(u);
    perform tt.seed_steps(u, today, 0);                       -- reloj lejano: la plausibilidad no molesta
    perform earn_points_from_steps(u, today, st);
    perform tt.t_eq(format('%s pasos dan %s Puntos', st, st / 1000), tt.steps_pts(u, today), st / 1000);
  end loop;

  -- ===== Tope de 20 Puntos por día =====
  foreach st in array array[19999, 20000, 25000, 60000] loop
    u := tt.mk_user(); perform tt.t_as(u);
    perform tt.seed_steps(u, today, 0);
    perform earn_points_from_steps(u, today, st);
    perform tt.t_eq(format('tope diario: %s pasos dan %s Puntos', st, least(st / 1000, 20)), tt.steps_pts(u, today), least(st / 1000, 20));
  end loop;

  -- ===== Idempotencia e incrementos =====
  u := tt.mk_user(); perform tt.t_as(u); perform tt.seed_steps(u, today, 0);
  perform earn_points_from_steps(u, today, 3000);
  perform earn_points_from_steps(u, today, 3000);
  select count(*) into n from points_ledger where user_id = u and reason = 'steps';
  perform tt.t_eq('mismo total dos veces: un solo asiento en el ledger', n, 1);
  perform earn_points_from_steps(u, today, 5000);
  select count(*) into n from points_ledger where user_id = u and reason = 'steps';
  perform tt.t_eq('de 3.000 a 5.000: se acredita solo la diferencia (2 asientos, 5 Puntos)', n * 10 + tt.steps_pts(u, today), 25);
  bal := earn_points_from_steps(u, today, 5000);
  perform tt.t_eq('la función devuelve el saldo', bal, 5);

  -- Si el dispositivo manda menos pasos que antes, no se quitan Puntos y los pasos guardados se quedan en el mayor (0063).
  bal := earn_points_from_steps(u, today, 2000);
  perform tt.t_eq('menos pasos que antes: los Puntos ya ganados no se quitan', bal, 5);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('menos pasos que antes: los pasos guardados no bajan', st, 5000);

  -- Pasos negativos: se toman como 0, sin error.
  u := tt.mk_user(); perform tt.t_as(u); perform tt.seed_steps(u, today, 0);
  perform earn_points_from_steps(u, today, -500);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('pasos negativos: se guardan como 0', st, 0);

  -- ===== Fechas válidas: hoy y ayer =====
  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.t_raises('mañana no se puede sincronizar', format('select earn_points_from_steps(%L, %L, 1000)', u, today + 1), 'Fecha de sincronización inválida');
  perform tt.t_raises('hace dos días no se puede sincronizar', format('select earn_points_from_steps(%L, %L, 1000)', u, today - 2), 'Fecha de sincronización inválida');
  perform earn_points_from_steps(u, ytd, 20000);
  perform earn_points_from_steps(u, today, 20000);
  perform tt.t_eq('ayer y hoy tienen cada uno su tope de 20 (40 Puntos)', tt.steps_pts(u, ytd) + tt.steps_pts(u, today), 40);
  perform tt.t_eq('el saldo suma los dos días', user_points_balance(u), 40);

  -- ===== Identidad =====
  u2 := tt.mk_user();
  perform tt.t_raises('no se pueden mandar pasos de otra persona', format('select earn_points_from_steps(%L, %L, 1000)', u2, today), 'No autorizado');
  perform tt.t_as(null);
  -- BUG latente: `p_user_id <> auth.uid()` es NULL cuando no hay sesión, y un IF con NULL no levanta el error.
  -- Hoy lo tapa el REVOKE a anon de 0034 (ver 70_privileges.sql); el service_role sí pasaría con cualquier p_user_id.
  perform tt.t_xfail_raises('sin sesión (auth.uid() nulo) la función debería rechazar la llamada', format('select earn_points_from_steps(%L, %L, 1000)', u, today), 'No autorizado');

  -- ===== Tope de pasos guardados por día =====
  -- 0038 dice "tope de 100.000 al día", pero el trigger de 0018 (clamp_daily_steps) recorta a 60.000 al guardar.
  u := tt.mk_user(); perform tt.t_as(u); perform tt.seed_steps(u, today, 0);
  perform earn_points_from_steps(u, today, 150000);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('150.000 pasos: se guardan 60.000 (trigger 0018; el 100.000 de 0038 no se alcanza nunca)', st, 60000);
  perform tt.t_eq('150.000 pasos: igual el tope de Puntos es 20', tt.steps_pts(u, today), 20);

  -- ===== Plausibilidad (0038): 300 pasos por minuto + 2.000 de margen desde la última sincronización =====
  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 5000, 1);                     -- 5.000 pasos, última sync hace 1 minuto
  perform earn_points_from_steps(u, today, 50000);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('hace 1 minuto con 5.000: se permite hasta 5.000 + 2.000 + 300 = 7.300', st, 7300);
  perform tt.t_eq('... y eso da 7 Puntos', tt.steps_pts(u, today), 7);

  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 5000, 0);                     -- recién sincronizado
  perform earn_points_from_steps(u, today, 50000);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('recién sincronizado: se permite solo el margen de 2.000 (7.000)', st, 7000);

  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 0, 10);                       -- 0 pasos, última sync hace 10 minutos
  perform earn_points_from_steps(u, today, 20000);
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('10 minutos desde 0: se permite 2.000 + 3.000 = 5.000', st, 5000);

  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 5000, 1);
  perform earn_points_from_steps(u, today, 6000);               -- pide menos de lo permitido
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('si pide menos de lo permitido, se guarda lo pedido', st, 6000);

  -- Ayer sin fila previa: la ventana arranca a medianoche de ayer (más de 24 h), así que no limita.
  u := tt.mk_user(); perform tt.t_as(u);
  perform earn_points_from_steps(u, ytd, 25000);
  perform tt.t_eq('ayer sin fila previa: 25.000 pasos dan 20 Puntos', tt.steps_pts(u, ytd), 20);

  -- ===== BUG: el margen de 2.000 se suma en CADA llamada, no una vez por tiempo transcurrido =====
  -- Cada sync actualiza updated_at = now(); la siguiente llamada vuelve a sumar +2.000 sin que pase tiempo.
  -- Con ~10 llamadas seguidas se llega al tope de 20 Puntos sin caminar (la antitrampa de 0038 no frena nada).
  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 0, 1);                        -- permitido en la primera: 2.000 + 300 = 2.300
  for i in 1..10 loop perform earn_points_from_steps(u, today, 100000); end loop;
  select steps into st from steps_daily where user_id = u and day = today;
  perform tt.t_xfail_true('10 sincronizaciones seguidas no deberían pasar de un solo margen (4.300 pasos)', st <= 4300, format('pasos guardados = %s, Puntos = %s', st, tt.steps_pts(u, today)));

  -- ===== Meta de cada día (0039) =====
  u := tt.mk_user(6000); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 0); perform tt.seed_steps(u, ytd, 0);
  perform earn_points_from_steps(u, today, 3000);
  perform earn_points_from_steps(u, ytd, 3000);
  select goal into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('la primera sync guarda la meta vigente (hoy)', st, 6000);
  update profiles set daily_goal = 3000 where id = u;
  perform earn_points_from_steps(u, today, 3500);
  perform earn_points_from_steps(u, ytd, 3500);
  select goal into st from steps_daily where user_id = u and day = today;
  perform tt.t_eq('si cambia la meta hoy, hoy se mide con la nueva', st, 3000);
  select goal into st from steps_daily where user_id = u and day = ytd;
  perform tt.t_eq('los días cerrados conservan la meta que tenían', st, 6000);
  -- Fila vieja sin meta (anterior a 0039): se completa con la meta actual la primera vez.
  u := tt.mk_user(4000); perform tt.t_as(u);
  perform tt.seed_steps(u, ytd, 1000, 1200, null);
  perform earn_points_from_steps(u, ytd, 2000);
  select goal into st from steps_daily where user_id = u and day = ytd;
  perform tt.t_eq('día viejo sin meta: toma la meta actual (una sola vez)', st, 4000);
  -- La base impide una meta menor a 1.000 (0032).
  perform tt.t_raises('meta mínima 1.000 exigida por la base', format('update profiles set daily_goal = 999 where id = %L', u), 'profiles_daily_goal_min');

  -- ===== Referido: 5 Puntos al referente la primera vez que el referido gana Puntos por pasos (0033) =====
  u := tt.mk_user(6000, 'Ana Gómez'); u2 := tt.mk_user(6000, 'Referente');
  insert into referrals (referrer_user_id, referred_user_id) values (u2, u);
  perform tt.t_as(u); perform tt.seed_steps(u, today, 0);
  perform earn_points_from_steps(u, today, 500);                -- 0 Puntos: todavía no cuenta
  select count(*) into n from points_ledger where user_id = u2;
  perform tt.t_eq('el referido sin Puntos todavía no acredita al referente', n, 0);
  perform earn_points_from_steps(u, today, 1000);
  select * into r from points_ledger where user_id = u2 and reason = 'referral';
  perform tt.t_eq('al primer Punto del referido, el referente recibe 5', r.amount, 5);
  perform tt.t_eq('la nota dice quién se sumó', r.note, 'Ana se sumó');
  perform tt.t_true('el crédito del referido vence a los 90 días', r.expires_at = now() + interval '90 days');
  perform earn_points_from_steps(u, today, 3000);
  select count(*) into n from points_ledger where user_id = u2 and reason = 'referral';
  perform tt.t_eq('el crédito por referido se da una sola vez', n, 1);
  select count(*) into n from notifications_outbox where user_id = u2 and data->>'type' = 'referral_credited';
  perform tt.t_eq('se encola un aviso al referente', n, 1);
  perform tt.t_eq('el saldo del referente incluye los 5', user_points_balance(u2), 5);
end $$;

rollback;
