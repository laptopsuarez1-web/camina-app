-- PROPUESTA 0048 (SEC-22): el ranking global no devuelve nada con 1.000 usuarios o menos; con más de 1.000 funciona como siempre.
-- Sin la propuesta: "con pocos usuarios no devuelve filas" falla (devuelve nombre, foto y pasos de todos).
begin;

do $$
declare
  a uuid; b uuid; c uuid; oculto uuid; today date := local_today(); n integer; nombres text; cliente uuid; prom numeric;
begin
  a := tt.mk_user(6000, 'Ana'); b := tt.mk_user(6000, 'Beto'); c := tt.mk_user(6000, 'Carla'); oculto := tt.mk_user(6000, 'Oculto'); cliente := tt.mk_user(6000, 'Quien mira');
  perform tt.seed_steps(a, today, 9000); perform tt.seed_steps(b, today, 12000); perform tt.seed_steps(c, today, 3000); perform tt.seed_steps(oculto, today, 50000);
  update profiles set ranking_visible = false where id = oculto;

  -- ===== Con pocos usuarios: vacío (aunque haya gente visible con pasos) =====
  perform tt.as_client(cliente);
  select count(*) into n from global_weekly_ranking(20);
  perform tt.t_eq('con 5 usuarios el ranking global no devuelve filas', n, 0);
  select count(*) into n from global_weekly_ranking(100);
  perform tt.t_eq('... ni pidiendo el máximo', n, 0);
  select community_weekly_average() into prom;
  perform tt.t_true('el promedio de la comunidad no cambia (solo un número, sin identidades): (9000+12000+3000+50000)/4 = 18500', prom = 18500);
  perform tt.as_admin();

  -- ===== Justo en el umbral: 1.000 usuarios todavía no abre (la app pide "más de 1.000") =====
  insert into auth.users (id, email) select gen_random_uuid(), 'bulk' || g || '@test.local' from generate_series(1, 1000 - 5) g;
  insert into profiles (id, full_name) select id, 'Bulk' from auth.users where email like 'bulk%@test.local';
  perform tt.t_eq('hay exactamente 1.000 perfiles', app_user_count(), 1000);
  perform tt.as_client(cliente);
  select count(*) into n from global_weekly_ranking(20);
  perform tt.t_eq('con exactamente 1.000 usuarios sigue vacío', n, 0);
  perform tt.as_admin();

  -- ===== Con 1.001: funciona como siempre =====
  perform tt.mk_user(6000, 'Perfil 1001');
  perform tt.t_eq('hay 1.001 perfiles', app_user_count(), 1001);
  perform tt.as_client(cliente);
  select string_agg(full_name, ',' order by total_steps desc) into nombres from global_weekly_ranking(20);
  perform tt.t_eq('con más de 1.000 usuarios: orden por pasos, sin ocultos ni gente en cero', nombres, 'Beto,Ana,Carla');
  select count(*) into n from global_weekly_ranking(2);
  perform tt.t_eq('... el límite pedido se respeta', n, 2);
  perform tt.t_true('... y las columnas del resultado son las de siempre', (select count(*) from (select user_id, full_name, photo_url, total_steps from global_weekly_ranking(1)) x) = 1);
  perform tt.as_admin();

  -- ===== Permisos intactos =====
  perform tt.t_true('authenticated sigue pudiendo ejecutar global_weekly_ranking', has_function_privilege('authenticated', 'global_weekly_ranking(integer)', 'execute'));
  perform tt.t_true('anon sigue sin poder', not has_function_privilege('anon', 'global_weekly_ranking(integer)', 'execute'));
end $$;

rollback;
