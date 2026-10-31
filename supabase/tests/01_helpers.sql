-- Ayudantes de aserción. Cada prueba imprime una línea PASS|... o FAIL|... con RAISE NOTICE,
-- que run.sh cuenta. Los avisos sobreviven al rollback con que cada archivo se aísla.
--   t_pass/t_fail('nombre')                       marca directo
--   t_eq('nombre', actual, esperado)              igualdad (también para NULL)
--   t_true('nombre', condición)
--   t_raises('nombre', 'sql', 'fragmento del mensaje')   la sentencia debe fallar con ese texto
--   t_xfail_eq(...) / t_xfail_true(...) / t_xfail_raises(...)   bug CONOCIDO: la regla correcta todavía NO se cumple.
--                                                 Si pasa, avisa XPASS (hay que quitar el xfail).
--   t_skip('nombre', 'motivo')                    no aplica hoy (por ejemplo, depende del día de la semana)
--   t_as(uuid)                                    simula a esa persona logueada (auth.uid()), con rol de superusuario
--   as_client(uuid) / as_admin()                  igual, pero además pasa al rol `authenticated` (aplica RLS y permisos)
create schema if not exists tt;

create or replace function tt.t_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true),
         set_config('request.jwt.claim.role', case when p_user is null then '' else 'authenticated' end, true)
$$;

create or replace function tt.as_client(p_user uuid) returns void language plpgsql as $$
begin
  perform tt.t_as(p_user);
  execute 'set local role authenticated';
end $$;

create or replace function tt.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform tt.t_as(null);
end $$;

create or replace function tt.t_skip(p_name text, p_why text) returns void language plpgsql as $$
begin raise notice 'SKIP|%|%', p_name, p_why; end $$;

create or replace function tt.t_pass(p_name text) returns void language plpgsql as $$
begin raise notice 'PASS|%', p_name; end $$;
create or replace function tt.t_fail(p_name text, p_detail text default '') returns void language plpgsql as $$
begin raise notice 'FAIL|%|%', p_name, p_detail; end $$;

create or replace function tt.t_true(p_name text, p_cond boolean) returns void language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS|%', p_name;
  else raise notice 'FAIL|%|condición falsa', p_name; end if;
end $$;

create or replace function tt.t_eq(p_name text, p_actual anyelement, p_expected anyelement) returns void language plpgsql as $$
begin
  if p_actual is not distinct from p_expected then raise notice 'PASS|%', p_name;
  else raise notice 'FAIL|%|esperado=% real=%', p_name, p_expected, p_actual; end if;
end $$;

create or replace function tt.t_raises(p_name text, p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_fragment || '%' then raise notice 'PASS|%', p_name;
    else raise notice 'FAIL|%|falló con otro mensaje: %', p_name, sqlerrm; end if;
    return;
  end;
  raise notice 'FAIL|%|no falló (se esperaba: %)', p_name, p_fragment;
end $$;

create or replace function tt.t_xfail_eq(p_name text, p_actual anyelement, p_expected anyelement) returns void language plpgsql as $$
begin
  if p_actual is not distinct from p_expected then raise notice 'XPASS|%|el bug ya no ocurre: quitar el xfail', p_name;
  else raise notice 'XFAIL|%|esperado=% real=%', p_name, p_expected, p_actual; end if;
end $$;

create or replace function tt.t_xfail_true(p_name text, p_cond boolean, p_detail text default '') returns void language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'XPASS|%|el bug ya no ocurre: quitar el xfail', p_name;
  else raise notice 'XFAIL|%|%', p_name, p_detail; end if;
end $$;

create or replace function tt.t_xfail_raises(p_name text, p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_fragment || '%' then raise notice 'XPASS|%|el bug ya no ocurre: quitar el xfail', p_name;
    else raise notice 'XFAIL|%|falló con otro mensaje: %', p_name, sqlerrm; end if;
    return;
  end;
  raise notice 'XFAIL|%|no falló (se esperaba: %)', p_name, p_fragment;
end $$;

-- Fábricas de datos mínimos.
create or replace function tt.mk_user(p_goal integer default 6000, p_name text default 'Persona') returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v, v || '@test.local');
  insert into profiles (id, full_name, daily_goal) values (v, p_name, p_goal);
  -- Cada persona de prueba tiene su propio celular (un celular, una cuenta).
  insert into device_owners (device_id, user_id) values ('test-' || v, v);
  insert into user_devices (device_id, user_id) values ('test-' || v, v);
  return v;
end $$;

create or replace function tt.mk_benefit(p_cost integer default 10, p_quota integer default 3) returns uuid language plpgsql as $$
declare b uuid := gen_random_uuid(); x uuid := gen_random_uuid();
begin
  insert into businesses (id, name, category, plan, approved) values (b, 'Comercio ' || left(b::text, 4), 'Café', 'paso_firme', true);
  insert into benefits (id, business_id, name, type, cost_points, daily_quota) values (x, b, 'Café gratis', 'gratis', p_cost, p_quota);
  return x;
end $$;

-- Da puntos con vencimiento a medida (días desde hoy; negativo = ya vencidos).
create or replace function tt.give(p_user uuid, p_amount integer, p_expires_in_days integer) returns void language sql as $$
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (p_user, p_amount, 'challenge', now() + make_interval(days => coalesce(p_expires_in_days, 90) - 90),
          case when p_expires_in_days is null then null else now() + make_interval(days => p_expires_in_days) end)
$$;


-- Pasos que dieron Puntos ese día (suma del ledger por pasos).
create or replace function tt.steps_pts(p_user uuid, p_day date) returns integer language sql as $$
  select coalesce(sum(amount), 0)::integer from points_ledger where user_id = p_user and reason = 'steps' and ref_day = p_day
$$;

-- Deja una fila de pasos del día con "última sincronización" hace p_minutes (para controlar la plausibilidad).
create or replace function tt.seed_steps(p_user uuid, p_day date, p_steps integer, p_minutes_ago integer default 1200, p_goal integer default null)
returns void language sql as $$
  insert into steps_daily (user_id, day, steps, updated_at, goal)
  values (p_user, p_day, p_steps, now() - make_interval(mins => p_minutes_ago), p_goal)
  on conflict (user_id, day) do update set steps = excluded.steps, updated_at = excluded.updated_at, goal = excluded.goal
$$;

grant usage on schema tt to public;
grant execute on all functions in schema tt to public;
