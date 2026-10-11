-- PROPUESTA 0051 (SEC-29 / CR-02): el RPC devuelve los pasos de quienes comparten grupo, y nada más; steps_daily sigue cerrada.
-- Sin la propuesta: la RLS deja ver solo los pasos propios (el bug de los rankings de grupo en cero) y el RPC no existe.
begin;

do $$
declare
  a uuid; b uuid; c uuid; d uuid; e uuid; g uuid; h uuid; today date := local_today();
  hay boolean := to_regprocedure('public.group_members_steps(date)') is not null;
  n integer; tot integer; ids uuid[]; monday date := date_trunc('week', local_today())::date;
begin
  a := tt.mk_user(6000, 'Ana'); b := tt.mk_user(6000, 'Beto'); c := tt.mk_user(6000, 'Carla'); d := tt.mk_user(6000, 'Dani'); e := tt.mk_user(6000, 'Sin grupo');
  insert into groups (name, created_by) values ('Grupo G', a) returning id into g;
  insert into groups (name, created_by) values ('Grupo H', c) returning id into h;
  insert into group_members (group_id, user_id) values (g, a), (g, b), (g, c), (h, c), (h, d);
  perform tt.seed_steps(a, today, 1000); perform tt.seed_steps(a, today - 1, 1100);
  perform tt.seed_steps(b, today, 2000); perform tt.seed_steps(b, today - 3, 2200); perform tt.seed_steps(b, today - 10, 9999);   -- el de hace 10 días queda fuera de la ventana
  perform tt.seed_steps(c, today, 3000);
  perform tt.seed_steps(d, today, 4000);
  perform tt.seed_steps(e, today, 5000);

  -- ===== El bug (existe con y sin la propuesta): la RLS no deja leer pasos ajenos =====
  perform tt.as_client(a);
  select count(*) into n from steps_daily where user_id in (b, c);
  perform tt.t_eq('RLS: steps_daily directo no devuelve pasos de otros miembros (por eso los rankings salían en cero)', n, 0);
  perform tt.as_admin();

  perform tt.t_true('existe group_members_steps(date)', hay);
  if not hay then
    perform tt.t_fail('el RPC de pasos de miembros funciona', 'no existe: los hooks de Grupos no tienen cómo leer los pasos de los demás');
    return;
  end if;

  -- ===== Permisos =====
  perform tt.t_true('authenticated puede ejecutar el RPC', has_function_privilege('authenticated', 'public.group_members_steps(date)', 'execute'));
  perform tt.t_true('anon NO puede ejecutar el RPC', not has_function_privilege('anon', 'public.group_members_steps(date)', 'execute'));

  -- ===== Miembros del mismo grupo =====
  perform tt.as_client(a);
  select array_agg(distinct x.user_id) into ids from group_members_steps(monday - 7) x;
  perform tt.t_true('Ana (solo en G) ve a Ana, Beto y Carla', ids @> array[a, b, c] and array_length(ids, 1) = 3);
  perform tt.t_true('... y NO ve a Dani (que solo comparte el grupo H con Carla) ni a la persona sin grupo', not (d = any(ids)) and not (e = any(ids)));
  select coalesce(sum(steps), 0) into tot from group_members_steps(today - 7) where user_id = b;
  perform tt.t_eq('los pasos de Beto de los últimos 8 días: 2.000 + 2.200 (el de hace 10 días no entra)', tot, 4200);
  select count(*) into n from group_members_steps(today) where user_id = b;
  perform tt.t_eq('p_since acota hacia adelante: desde hoy, solo 1 fila de Beto', n, 1);
  select count(*) into n from group_members_steps(today - 400) where user_id = b and day = today - 10;
  perform tt.t_eq('p_since muy viejo NO amplía la ventana (máximo hoy - 7): el día de hace 10 días no se devuelve', n, 0);
  select count(*) into n from group_members_steps();
  perform tt.t_true('sin p_since usa la ventana máxima (hoy - 7)', n = 5);   -- a: 2 filas, b: 2 filas (hoy, hoy-3), c: 1 fila
  select count(*) into n from steps_daily where user_id = b;
  perform tt.t_eq('steps_daily sigue cerrada: leer directo los pasos de Beto sigue dando 0 filas', n, 0);
  perform tt.as_admin();

  -- ===== Quien está en dos grupos ve a los de ambos =====
  perform tt.as_client(c);
  select array_agg(distinct x.user_id) into ids from group_members_steps(today - 7) x;
  perform tt.t_true('Carla (en G y H) ve a Ana, Beto, Carla y Dani', ids @> array[a, b, c, d] and array_length(ids, 1) = 4);
  perform tt.as_admin();

  -- ===== Sin grupo, o sin sesión =====
  perform tt.as_client(e);
  select count(*) into n from group_members_steps(today - 7);
  perform tt.t_eq('una persona sin grupo no ve pasos de nadie (ni los propios por este RPC)', n, 0);
  perform tt.as_admin();
  perform tt.t_as(null);
  select count(*) into n from group_members_steps(today - 7);
  perform tt.t_eq('sin sesión (auth.uid() nulo) devuelve cero filas, no toda la tabla', n, 0);
  perform tt.as_admin();
  execute 'set local role anon';
  perform tt.t_raises('anon: el RPC es rechazado', 'select * from group_members_steps(current_date)', 'permission denied');
  perform tt.as_admin();

  -- ===== Quien se va del grupo deja de ver =====
  delete from group_members where group_id = g and user_id = a;
  perform tt.as_client(a);
  select count(*) into n from group_members_steps(today - 7);
  perform tt.t_eq('Ana sale del grupo G y deja de ver los pasos de Beto y Carla', n, 0);
  perform tt.as_admin();

  -- ===== Uso que hace la app: total semanal por miembro (equivale a lo que calcula useGroupDetail) =====
  insert into group_members (group_id, user_id) values (g, a);
  perform tt.as_client(a);
  select sum(steps) into tot from group_members_steps(monday) where user_id = b;
  perform tt.t_eq('total semanal de Beto desde el lunes (hoy 2.000 + el de hace 3 días si cae en esta semana)', tot, 2000 + case when today - 3 >= monday then 2200 else 0 end);
  perform tt.as_admin();
end $$;

rollback;
