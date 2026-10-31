-- 1) Un celular, una cuenta. Antes register_device solo anotaba qué cuentas pasaron por cada celular (para alertas),
--    pero los pasos salen del teléfono (Salud / Health Connect), así que una segunda cuenta en el mismo celular
--    "heredaba" los pasos ya caminados y cobraba los mismos Puntos. Ahora cada celular tiene UNA cuenta dueña
--    (la primera que lo usó) y el servidor no acredita pasos a otra cuenta que entre desde ese celular.
-- 2) El bono de racha de 7 días (+5 Puntos) exige al menos 5.000 pasos cada día, sea cual sea la meta de la persona.
--    La racha que se muestra sigue siendo según la meta de cada uno.

-- ---------- 1) Dueña de cada celular ----------
create table if not exists device_owners (
  device_id text primary key check (char_length(device_id) between 6 and 128),
  user_id uuid not null references profiles (id) on delete cascade,
  bound_at timestamptz not null default now()
);
alter table device_owners enable row level security;
-- Sin policies: solo se escribe con register_device() y admin_release_device().

-- Celulares que ya tenían varias cuentas: se queda la más antigua en ese celular.
insert into device_owners (device_id, user_id, bound_at)
select distinct on (device_id) device_id, user_id, first_seen
from user_devices
order by device_id, first_seen, user_id
on conflict do nothing;

-- Devuelve 'ok' si este celular es de esta cuenta (o estaba libre y ahora lo es) y 'blocked' si es de otra.
drop function if exists register_device(text);
create or replace function register_device(p_device_id text) returns text as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  insert into device_owners (device_id, user_id) values (p_device_id, auth.uid())
  on conflict (device_id) do nothing;
  select user_id into v_owner from device_owners where device_id = p_device_id;
  insert into user_devices (device_id, user_id, last_seen) values (p_device_id, auth.uid(), clock_timestamp())
  on conflict (device_id, user_id) do update set last_seen = clock_timestamp();
  return case when v_owner = auth.uid() then 'ok' else 'blocked' end;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function register_device(text) from public, anon;
grant execute on function register_device(text) to authenticated;

-- ¿Esta cuenta puede sumar pasos desde el celular que está usando? Mira el último celular que registró:
-- si no registró ninguno todavía, tampoco suma (la app lo registra antes de mandar pasos).
create or replace function device_allows_steps(p_user uuid) returns boolean as $$
  select coalesce(
    (select o.user_id = p_user
       from user_devices d join device_owners o on o.device_id = d.device_id
      where d.user_id = p_user
      order by d.last_seen desc
      limit 1),
    false);
$$ language sql stable security definer set search_path = public;
revoke execute on function device_allows_steps(uuid) from public, anon, authenticated;

-- Para el equipo: liberar un celular (por ejemplo, la persona cambió de cuenta a propósito y lo pidió).
create or replace function admin_release_device(p_device_id text) returns void as $$
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede hacer esto.';
  end if;
  delete from device_owners where device_id = p_device_id;
  delete from user_devices where device_id = p_device_id;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function admin_release_device(text) from public, anon;
grant execute on function admin_release_device(text) to authenticated;

-- Igual que 0067, más el control del celular: una cuenta que no es dueña del celular recibe el saldo sin
-- que se guarden pasos ni Puntos (sin error, para no romper la sincronización de las versiones viejas).
create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
  v_today date := local_today();
  v_allowed integer;
  v_steps integer;
  v_goal integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day = v_today - 1 then
    return user_points_balance(p_user_id);
  end if;

  if p_day <> v_today then
    raise exception 'Fecha de sincronización inválida';
  end if;

  if not device_allows_steps(p_user_id) then
    return user_points_balance(p_user_id);
  end if;

  v_allowed := steps_allowed_at(p_day, now());
  v_steps := greatest(0, least(p_steps, v_allowed, 100000));

  select daily_goal into v_goal from profiles where id = p_user_id;

  insert into steps_daily (user_id, day, steps, updated_at, goal)
  values (p_user_id, p_day, v_steps, now(), v_goal)
  on conflict (user_id, day) do update
    set steps = greatest(steps_daily.steps, excluded.steps),
        updated_at = now(),
        goal = case when steps_daily.day = v_today then excluded.goal else coalesce(steps_daily.goal, excluded.goal) end;

  perform 1 from steps_daily where user_id = p_user_id and day = p_day for update;
  select steps into v_steps from steps_daily where user_id = p_user_id and day = p_day;

  v_target_points := least(floor(v_steps / 1000.0)::integer, v_cap);

  select coalesce(sum(amount), 0) into v_already_earned
  from points_ledger
  where user_id = p_user_id and reason = 'steps' and ref_day = p_day;

  v_delta := v_target_points - v_already_earned;
  if v_delta > 0 then
    insert into points_ledger (user_id, amount, reason, ref_day, expires_at)
    values (p_user_id, v_delta, 'steps', p_day, now() + (points_ttl_days() || ' days')::interval);
  end if;

  return user_points_balance(p_user_id);
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 2) Racha: bono solo con 5.000 pasos o más cada día ----------
create or replace function streak_bonus_min_steps() returns integer as $f$
  select 5000;
$f$ language sql immutable;
revoke execute on function streak_bonus_min_steps() from public, anon, authenticated;

-- Días seguidos (hasta hoy, o hasta ayer si hoy todavía no llega) con pasos >= max(meta de ese día, p_min).
create or replace function streak_run(p_user uuid, p_min integer)
returns table (n integer, first_day date) as $f$
declare
  v_day date := local_today();
  v_n integer := 0;
  v_met boolean;
begin
  select coalesce(sd.steps >= greatest(coalesce(sd.goal, (select daily_goal from profiles where id = p_user), 6000), p_min), false)
    into v_met from steps_daily sd where sd.user_id = p_user and sd.day = v_day;
  if not coalesce(v_met, false) then
    v_day := v_day - 1;
  end if;
  loop
    select coalesce(sd.steps >= greatest(coalesce(sd.goal, (select daily_goal from profiles where id = p_user), 6000), p_min), false)
      into v_met from steps_daily sd where sd.user_id = p_user and sd.day = v_day;
    exit when not coalesce(v_met, false) or v_n >= 400;
    v_n := v_n + 1;
    v_day := v_day - 1;
  end loop;
  n := v_n;
  first_day := case when v_n > 0 then v_day + 1 else null end;
  return next;
end;
$f$ language plpgsql stable security definer set search_path = public;
revoke execute on function streak_run(uuid, integer) from public, anon, authenticated;

-- streak: la racha según la meta de cada persona (lo que se muestra). streak_start / blocks_*: los bloques de 7 días
-- que dan bono, que solo cuentan días de 5.000 pasos o más.
create or replace function my_streak_state()
returns table (streak integer, streak_start date, blocks_done integer, blocks_claimed integer) as $f$
declare
  v_user uuid := auth.uid();
  v_b record;
begin
  if v_user is null then
    return;
  end if;
  select r.n into streak from streak_run(v_user, 1000) r;
  select * into v_b from streak_run(v_user, streak_bonus_min_steps());
  streak_start := v_b.first_day;
  blocks_done := v_b.n / 7;
  blocks_claimed := case when v_b.n > 0
    then (select count(*)::integer from generate_series(1, v_b.n / 7) k
          where exists (select 1 from streak_claims c where c.user_id = v_user
                          and c.block_start <= v_b.first_day + 7 * k - 1
                          and c.block_end >= v_b.first_day + 7 * (k - 1)))
    else 0 end;
  return next;
end;
$f$ language plpgsql stable security definer set search_path = public;
revoke execute on function my_streak_state() from public, anon;
grant execute on function my_streak_state() to authenticated;
