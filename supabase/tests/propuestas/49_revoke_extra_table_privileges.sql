-- PROPUESTA 0049 (SEC-24): anon y authenticated pierden TRUNCATE/REFERENCES/TRIGGER en todas las tablas; el uso normal sigue igual.
-- Sin la propuesta: la lista de tablas con permisos de sobra no está vacía.
begin;

do $$
declare
  n integer; priv text; rol text; lista text; u uuid; v uuid; g uuid; b uuid; bz uuid; nota uuid;
begin
  -- ===== Permisos de sobra =====
  foreach rol in array array['anon', 'authenticated'] loop
    foreach priv in array array['TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      select count(*), string_agg(c.relname, ', ') into n, lista
      from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relkind in ('r', 'v', 'p') and has_table_privilege(rol, c.oid, priv);
      perform tt.t_eq(rol || ' no tiene ' || priv || ' en ninguna tabla/vista de public', n, 0);
    end loop;
  end loop;
  perform tt.t_true('has_table_privilege(authenticated, points_ledger, TRUNCATE) = false', not has_table_privilege('authenticated', 'public.points_ledger', 'TRUNCATE'));
  perform tt.t_true('service_role conserva TRUNCATE (limpiezas del equipo)', has_table_privilege('service_role', 'public.points_ledger', 'TRUNCATE'));
  perform tt.t_raises('authenticated: TRUNCATE points_ledger rechazado', 'set local role authenticated; truncate points_ledger', 'permission denied');
  perform tt.as_admin();

  -- ===== El uso normal sigue funcionando (tablas con FK y triggers) =====
  u := tt.mk_user(6000, 'Persona'); v := tt.mk_user(6000, 'Otra'); b := tt.mk_benefit(5); select business_id into bz from benefits where id = b;
  insert into groups (name, created_by) values ('Grupo 49', u) returning id into g;
  perform tt.as_client(u);
  insert into group_members (group_id, user_id) values (g, u);
  perform tt.t_pass('insert en group_members (con FK y trigger de tamaño) sigue funcionando');
  insert into group_notes (group_id, user_id, text) values (g, u, 'Hola grupo');
  perform tt.t_pass('insert en group_notes (con FK y trigger de moderación) sigue funcionando');
  insert into favorite_businesses (user_id, business_id) values (u, bz);
  perform tt.t_pass('insert en favorite_businesses (FK) sigue funcionando');
  delete from favorite_businesses where user_id = u and business_id = bz;
  perform tt.t_pass('delete en favorite_businesses sigue funcionando');
  insert into push_tokens (user_id, token, platform) values (u, 'ExponentPushToken[49]', 'android');
  update profiles set zone = 'Centro' where id = u;
  perform tt.t_eq('update de profiles sigue funcionando', (select zone from profiles where id = u), 'Centro');
  insert into user_blocks (blocker_id, blocked_id) values (u, v);
  perform tt.t_pass('insert en user_blocks sigue funcionando');
  perform tt.as_admin();
  perform tt.t_eq('... y las filas quedaron escritas', (select count(*) from group_notes where group_id = g)::int, 1);
end $$;

rollback;
