-- PROPUESTA 0046 (SEC-08): anon no lista grupos; las personas con sesión siguen viendo la lista completa.
-- Sin la propuesta: "anon no ve los grupos" falla (anon lista todos).
begin;

do $$
declare
  a uuid; b uuid; g1 uuid; g2 uuid; n integer; total integer; gnew uuid; tgt integer;
begin
  a := tt.mk_user(6000, 'Creador'); b := tt.mk_user(6000, 'Otra persona');
  insert into groups (name, created_by) values ('Grupo uno', a) returning id into g1;
  insert into groups (name, created_by) values ('Grupo dos', a) returning id into g2;
  insert into group_members (group_id, user_id) values (g1, a), (g2, a);
  select count(*) into total from groups;

  -- ===== El problema =====
  execute 'set local role anon';
  begin
    select count(*) into n from groups;
  exception when others then n := -1;      -- permission denied: lo correcto
  end;
  perform tt.as_admin();
  perform tt.t_eq('anon no ve ningún grupo (permiso denegado)', n, -1);
  perform tt.t_true('anon no tiene SELECT sobre groups', not has_table_privilege('anon', 'public.groups', 'SELECT'));
  perform tt.t_eq('no queda ninguna política de groups para el rol public/anon', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'groups' and cmd in ('SELECT', 'ALL') and roles && array['public', 'anon']::name[])::int, 0);

  -- ===== Lo legítimo =====
  perform tt.as_client(b);
  select count(*) into n from groups;
  perform tt.t_eq('una persona con sesión que NO es miembro sigue viendo todos los grupos ("grupos para unirte")', n, total);
  perform tt.t_eq('... y puede leer el detalle de uno por id (pantalla de invitación)', (select name from groups where id = g1), 'Grupo uno');
  perform tt.as_client(b);
  insert into groups (name, created_by) values ('Grupo nuevo', b) returning id into gnew;
  perform tt.t_pass('crear un grupo con insert ... returning sigue funcionando');
  perform tt.t_eq('... y el creador lo lee', (select count(*) from groups where id = gnew)::int, 1);
  update groups set challenge_target = 50000 where id = gnew;
  select challenge_target into tgt from groups where id = gnew;
  perform tt.t_eq('el creador sigue pudiendo editar la meta de su grupo', tgt, 50000);
  update groups set challenge_target = 9999 where id = g1;
  perform tt.as_admin();
  perform tt.t_true('... y una persona ajena no puede editar el grupo de otra (la meta no cambió)', (select challenge_target from groups where id = g1) <> 9999);
  perform tt.as_client(b);
  perform tt.t_raises('crear un grupo a nombre de otra persona sigue rechazado', format('insert into groups (name, created_by) values (''X'', %L)', a), 'row-level security');
  perform tt.as_admin();
end $$;

rollback;
