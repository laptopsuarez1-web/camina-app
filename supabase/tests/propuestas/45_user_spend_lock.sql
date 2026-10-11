-- PROPUESTA 0045 (SEC-06): dos gastos simultáneos de la misma persona no se pisan.
-- Parte A (estructural, con rollback): las tres funciones toman el candado por persona.
-- Parte B (concurrencia REAL con dblink: dos conexiones a la vez). Sus datos se confirman en la base descartable y se
--   borran al final dentro del mismo bloque (también si algo falla a mitad de camino).
-- Sin la propuesta: la segunda llamada NO espera, pasa, y la persona gasta dos veces (doble gasto / cooldown salteado).
create extension if not exists dblink;

-- ================= Parte A =================
begin;

do $$
declare
  u uuid; g uuid; ch uuid; b uuid; held boolean; today date := local_today();
begin
  -- redeem_benefit
  u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 50, 60); perform tt.t_as(u);
  select count(*) > 0 into held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and ((classid::int8 << 32) | objid::int8) = hashtextextended(u::text, 0);
  perform tt.t_eq('antes de canjear no hay candado de la persona', held, false);
  perform redeem_benefit(b);
  select count(*) > 0 into held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and ((classid::int8 << 32) | objid::int8) = hashtextextended(u::text, 0);
  perform tt.t_eq('redeem_benefit toma el candado por persona', held, true);

  -- create_group_challenge
  u := tt.mk_user(); perform tt.give(u, 50, 60); insert into groups (name) values ('Grupo candado') returning id into g; insert into group_members (group_id, user_id) values (g, u);
  perform tt.t_as(u);
  ch := create_group_challenge(g, 'Desafío candado', 'steps', 5000, today + 1, today + 5, 10);
  select count(*) > 0 into held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and ((classid::int8 << 32) | objid::int8) = hashtextextended(u::text, 0);
  perform tt.t_eq('create_group_challenge toma el candado por persona', held, true);
  perform tt.t_eq('... y sigue descontando la puesta (50 - 10)', user_points_balance(u), 40);

  -- join_group_challenge
  u := tt.mk_user(); perform tt.give(u, 50, 60); insert into group_members (group_id, user_id) values (g, u);
  perform tt.t_as(u);
  perform join_group_challenge(ch);
  select count(*) > 0 into held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and ((classid::int8 << 32) | objid::int8) = hashtextextended(u::text, 0);
  perform tt.t_eq('join_group_challenge toma el candado por persona', held, true);
  perform tt.t_eq('... y sigue descontando la puesta (50 - 10)', user_points_balance(u), 40);

  -- sin sesión sigue rechazando antes de tomar candados
  perform tt.t_as(null);
  perform tt.t_raises('sin sesión redeem_benefit sigue rechazando', format('select redeem_benefit(%L)', b), 'No autorizado');
end $$;

rollback;

-- ================= Parte B =================
-- Corre dos canjes a la vez de la misma persona. La conexión 1 abre una transacción y canjea SIN confirmar; la conexión 2 canjea otro
-- beneficio mientras tanto. Con el candado la 2 se queda esperando; sin candado pasa de largo y confirma el doble gasto.
create or replace function tt.race_redeem(p_user uuid, p_b1 uuid, p_b2 uuid, out blocked boolean, out err text)
language plpgsql as $f$
declare
  cs text := format('host=%s port=%s dbname=%s user=postgres', (string_to_array(current_setting('unix_socket_directories'), ','))[1], current_setting('port'), current_database());
begin
  perform dblink_connect('race1', cs);
  perform dblink_connect('race2', cs);
  begin
    perform dblink_exec('race1', 'begin');
    perform 1 from dblink('race1', format('select set_config(''request.jwt.claim.sub'', %L, false)', p_user::text)) as t(x text);
    perform 1 from dblink('race2', format('select set_config(''request.jwt.claim.sub'', %L, false)', p_user::text)) as t(x text);
    perform 1 from dblink('race1', format('select (redeem_benefit(%L)).id::text', p_b1)) as t(x text);
    perform dblink_send_query('race2', format('select (redeem_benefit(%L)).id::text', p_b2));
    perform pg_sleep(0.8);
    blocked := dblink_is_busy('race2') = 1;
    perform dblink_exec('race1', 'commit');
    begin
      perform 1 from dblink_get_result('race2') as t(x text);
      err := null;
    exception when others then
      err := sqlerrm;
    end;
  exception when others then
    perform dblink_disconnect('race1'); perform dblink_disconnect('race2');
    raise;
  end;
  perform dblink_disconnect('race1'); perform dblink_disconnect('race2');
end $f$;

do $$
declare
  cs text := format('host=%s port=%s dbname=%s user=postgres', (string_to_array(current_setting('unix_socket_directories'), ','))[1], current_setting('port'), current_database());
  u1 uuid; u2 uuid; x1 uuid; x2 uuid; y1 uuid; y2 uuid; r record; n integer; bal integer; biz uuid;
  ids_biz uuid[];
begin
  perform dblink_connect('fx', cs);   -- conexión que confirma los datos de prueba (autocommit)
  begin
    -- Caso 1: doble gasto. Saldo 10, dos beneficios de 10 en comercios distintos.
    select id into u1 from dblink('fx', 'select tt.mk_user(6000, ''Carrera 1'')') as t(id uuid);
    select id into x1 from dblink('fx', 'select tt.mk_benefit(10, 5)') as t(id uuid);
    select id into x2 from dblink('fx', 'select tt.mk_benefit(10, 5)') as t(id uuid);
    perform 1 from dblink('fx', format('select tt.give(%L, 10, 60)', u1)) as t(x text);
    -- Caso 2: cooldown salteado. Saldo 50, dos beneficios del MISMO comercio.
    select id into u2 from dblink('fx', 'select tt.mk_user(6000, ''Carrera 2'')') as t(id uuid);
    select id into y1 from dblink('fx', 'select tt.mk_benefit(10, 5)') as t(id uuid);
    select business_id into biz from benefits where id = y1;
    select id into y2 from dblink('fx', format('insert into benefits (business_id, name, type, cost_points, daily_quota) values (%L, ''Segundo beneficio'', ''gratis'', 10, 5) returning id', biz)) as t(id uuid);
    perform 1 from dblink('fx', format('select tt.give(%L, 50, 60)', u2)) as t(x text);

    select * into r from tt.race_redeem(u1, x1, x2);
    select count(*) into n from redemptions where user_id = u1;
    perform tt.t_eq('doble gasto: la segunda llamada espera el candado de la persona (no pasa de largo)', r.blocked, true);
    perform tt.t_true('doble gasto: la segunda llamada recibe "Saldo insuficiente"', r.err like '%Saldo insuficiente%');
    perform tt.t_eq('doble gasto: se hizo un solo canje', n, 1);
    select coalesce(sum(amount), 0)::int into bal from points_ledger where user_id = u1;
    perform tt.t_eq('doble gasto: el libro nunca gasta más de lo que había (saldo real 0, no negativo escondido)', bal, 0);

    select * into r from tt.race_redeem(u2, y1, y2);
    select count(*) into n from redemptions where user_id = u2;
    perform tt.t_eq('cooldown: la segunda llamada espera el candado', r.blocked, true);
    perform tt.t_true('cooldown: el segundo canje del mismo comercio se rechaza por los 14 días', r.err like '%hace menos de 14 días%');
    perform tt.t_eq('cooldown: un solo canje en ese comercio', n, 1);
  exception when others then
    -- limpiar igual y volver a lanzar el error
    perform dblink_exec('fx', format('delete from redemptions where user_id in (%L, %L)', u1, u2));
    raise;
  end;

  -- ===== Limpieza de todo lo confirmado =====
  ids_biz := array(select business_id from benefits where id in (x1, x2, y1, y2));
  perform dblink_exec('fx', format('delete from redemptions where user_id in (%L, %L)', u1, u2));
  perform dblink_exec('fx', format('delete from points_ledger where user_id in (%L, %L)', u1, u2));
  perform dblink_exec('fx', format('delete from benefits where id in (%L, %L, %L, %L)', x1, x2, y1, y2));
  perform dblink_exec('fx', format('delete from businesses where id = any(%L::uuid[])', ids_biz));
  perform dblink_exec('fx', format('delete from profiles where id in (%L, %L)', u1, u2));
  perform dblink_exec('fx', format('delete from auth.users where id in (%L, %L)', u1, u2));
  perform dblink_disconnect('fx');
  perform tt.t_eq('la prueba de concurrencia no deja datos confirmados en la base', (select count(*) from profiles where full_name like 'Carrera %')::int + (select count(*) from businesses where id = any(ids_biz))::int, 0);
end $$;
