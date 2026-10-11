-- PROPUESTA 0041 (SEC-02, CR-03): un cliente no puede escribir pasos directo; la RPC y la lectura propia siguen andando.
-- Sin la propuesta: los tres 'permission denied' fallan (la escritura directa funciona y se cobran Puntos con pasos inventados).
begin;

do $$
declare
  u uuid; v uuid; today date := local_today(); ytd date := local_today() - 1; n integer; st integer; g integer; priv text;
begin
  u := tt.mk_user(6000); v := tt.mk_user(6000);
  perform tt.seed_steps(v, today, 1234);

  -- ===== Permisos y políticas =====
  foreach priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
    perform tt.t_true('authenticated NO tiene ' || priv || ' sobre steps_daily', not has_table_privilege('authenticated', 'public.steps_daily', priv));
    perform tt.t_true('anon NO tiene ' || priv || ' sobre steps_daily', not has_table_privilege('anon', 'public.steps_daily', priv));
  end loop;
  perform tt.t_true('authenticated SÍ tiene SELECT sobre steps_daily', has_table_privilege('authenticated', 'public.steps_daily', 'SELECT'));
  perform tt.t_eq('ya no existen políticas de INSERT/UPDATE sobre steps_daily', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'steps_daily' and cmd in ('INSERT', 'UPDATE'))::int, 0);

  -- ===== El ataque =====
  perform tt.as_client(u);
  perform tt.t_raises('ataque: INSERT de 60.000 pasos para hoy', format('insert into steps_daily (user_id, day, steps) values (%L, %L, 60000)', u, today), 'permission denied');
  perform tt.t_raises('ataque: INSERT de pasos de un día viejo', format('insert into steps_daily (user_id, day, steps) values (%L, %L, 30000)', u, today - 20), 'permission denied');
  perform tt.t_raises('ataque: fijar a mano la meta de un día (goal)', format('insert into steps_daily (user_id, day, steps, goal) values (%L, %L, 10, 1000)', u, ytd), 'permission denied');
  perform tt.t_raises('ataque: UPDATE de mis pasos', format('update steps_daily set steps = 60000 where user_id = %L', u), 'permission denied');
  perform tt.t_raises('ataque: DELETE de mis pasos', format('delete from steps_daily where user_id = %L', u), 'permission denied');
  perform tt.as_admin();
  perform tt.t_eq('no quedó ninguna fila inventada', (select count(*) from steps_daily where user_id = u)::int, 0);

  -- ===== Lo legítimo: la RPC sigue acreditando =====
  perform tt.seed_steps(u, today, 0);                       -- última sincronización hace 20 h (margen amplio sin importar la hora)
  perform tt.t_as(u);
  perform earn_points_from_steps(u, today, 3500);
  perform tt.t_eq('earn_points_from_steps sigue acreditando: 3.500 pasos = 3 Puntos', tt.steps_pts(u, today), 3);
  select steps, goal into st, g from steps_daily where user_id = u and day = today;
  perform tt.t_eq('... y guarda los pasos', st, 3500);
  perform tt.t_eq('... y la meta vigente del día', g, 6000);
  perform earn_points_from_steps(u, ytd, 2000);
  perform tt.t_eq('también se puede sincronizar ayer (ventana hoy/ayer)', (select steps from steps_daily where user_id = u and day = ytd), 2000);

  -- ===== Lo legítimo: la persona lee sus propios pasos y no los ajenos =====
  perform tt.as_client(u);
  select count(*) into n from steps_daily where user_id = u;
  perform tt.t_eq('la persona lee sus propias filas (hoy y ayer)', n, 2);
  select count(*) into n from steps_daily where user_id = v;
  perform tt.t_eq('... y no lee las de otra persona', n, 0);
  perform tt.as_admin();

  -- ===== Defensa en profundidad y cascada =====
  insert into steps_daily (user_id, day, steps) values (v, ytd, 90000);
  perform tt.t_eq('el trigger de recorte sigue activo (90.000 -> 60.000)', (select steps from steps_daily where user_id = v and day = ytd), 60000);
  delete from profiles where id = v;
  perform tt.t_eq('borrar el perfil sigue arrastrando sus pasos (cascada)', (select count(*) from steps_daily where user_id = v)::int, 0);
end $$;

rollback;
