-- PROPUESTA 0040 (SEC-01, crítico): public_profiles no se puede escribir, pero sigue leyéndose.
-- Corrido SIN la propuesta (TESTS_DIR=supabase/tests/propuestas) muestra el ataque: los 'permission denied' fallan porque
-- el UPDATE/DELETE/INSERT a través de la vista SÍ funciona y toca (o borra) el perfil de otra persona.
begin;

do $$
declare
  atacante uuid; victima uuid; miembro uuid; amigo uuid; fantasma uuid := gen_random_uuid(); g uuid;
  nombre text; n integer; foto text; priv text;
begin
  atacante := tt.mk_user(6000, 'Atacante'); victima := tt.mk_user(6000, 'Víctima');
  insert into auth.users (id, email) values (fantasma, fantasma || '@test.local');   -- cuenta sin perfil

  -- ===== Permisos sobre la vista =====
  foreach priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    perform tt.t_true('authenticated NO tiene ' || priv || ' sobre public_profiles', not has_table_privilege('authenticated', 'public.public_profiles', priv));
    perform tt.t_true('anon NO tiene ' || priv || ' sobre public_profiles', not has_table_privilege('anon', 'public.public_profiles', priv));
  end loop;
  perform tt.t_true('authenticated SÍ tiene SELECT sobre public_profiles', has_table_privilege('authenticated', 'public.public_profiles', 'SELECT'));
  perform tt.t_true('anon NO tiene SELECT sobre public_profiles', not has_table_privilege('anon', 'public.public_profiles', 'SELECT'));
  perform tt.t_true('service_role conserva sus permisos (SELECT y UPDATE)', has_table_privilege('service_role', 'public.public_profiles', 'SELECT') and has_table_privilege('service_role', 'public.public_profiles', 'UPDATE'));

  -- ===== El ataque (con la sesión de "Atacante") =====
  perform tt.as_client(atacante);
  perform tt.t_raises('ataque: UPDATE del nombre de otra persona por la vista', format('update public_profiles set full_name = ''HACKEADO'' where id = %L', victima), 'permission denied');
  perform tt.t_raises('ataque: INSERT de un perfil ajeno por la vista', format('insert into public_profiles (id, full_name) values (%L, ''Fantasma'')', fantasma), 'permission denied');
  perform tt.t_raises('ataque: DELETE del perfil de otra persona por la vista', format('delete from public_profiles where id = %L', victima), 'permission denied');
  perform tt.as_admin();
  select full_name into nombre from profiles where id = victima;
  perform tt.t_eq('el nombre de la víctima quedó intacto', nombre, 'Víctima');
  perform tt.t_eq('el perfil de la víctima sigue existiendo', (select count(*) from profiles where id = victima)::int, 1);
  perform tt.t_eq('no se creó ningún perfil para la cuenta fantasma', (select count(*) from profiles where id = fantasma)::int, 0);

  -- ===== Lo legítimo sigue andando: leer nombre y foto de otras personas (ranking de grupos) =====
  miembro := tt.mk_user(6000, 'Miembro'); amigo := tt.mk_user(6000, 'Amigo');
  update profiles set photo_url = 'https://ejemplo.test/foto-amigo.jpg' where id = amigo;
  g := gen_random_uuid();
  insert into groups (id, name, created_by) values (g, 'Grupo de prueba', miembro);
  insert into group_members (group_id, user_id) values (g, miembro), (g, amigo);
  perform tt.as_client(miembro);
  select count(*) into n from public_profiles where id in (miembro, amigo);
  perform tt.t_eq('una persona con sesión lee a los miembros de su grupo desde la vista', n, 2);
  select full_name, photo_url into nombre, foto from public_profiles where id = amigo;
  perform tt.t_eq('... el nombre del otro miembro', nombre, 'Amigo');
  perform tt.t_eq('... y su foto', foto, 'https://ejemplo.test/foto-amigo.jpg');
  select count(*) into n from profiles where id <> auth.uid();
  perform tt.t_eq('la tabla profiles sigue cerrada por RLS (solo el perfil propio): la vista es la única puerta de lectura', n, 0);
  perform tt.as_admin();
  execute 'set local role anon';
  perform tt.t_raises('anon: SELECT sobre la vista rechazado', 'select * from public_profiles', 'permission denied');
  perform tt.as_admin();

  -- ===== Permisos por defecto: lo nuevo no nace con escritura abierta =====
  create table tt_probe_default_acl (id int primary key);
  create view tt_probe_default_view as select id from tt_probe_default_acl;
  foreach priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    perform tt.t_true('tabla nueva: authenticated NO nace con ' || priv, not has_table_privilege('authenticated', 'public.tt_probe_default_acl', priv));
    perform tt.t_true('tabla nueva: anon NO nace con ' || priv, not has_table_privilege('anon', 'public.tt_probe_default_acl', priv));
  end loop;
  perform tt.t_true('vista nueva: authenticated NO nace con UPDATE', not has_table_privilege('authenticated', 'public.tt_probe_default_view', 'UPDATE'));
  perform tt.t_true('tabla nueva: authenticated nace con SELECT (la RLS decide)', has_table_privilege('authenticated', 'public.tt_probe_default_acl', 'SELECT'));
  perform tt.t_true('tabla nueva: service_role nace con todo', has_table_privilege('service_role', 'public.tt_probe_default_acl', 'INSERT'));
end $$;

rollback;
