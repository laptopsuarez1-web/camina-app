-- 1) Meta diaria de cada día: al cambiar la meta, los días anteriores conservan la que tenían.
alter table steps_daily add column if not exists goal integer;

-- earn_points_from_steps (0038) ahora guarda la meta vigente del día. Los días ya cerrados
-- conservan la suya; hoy toma la meta actual (si la cambió hoy, hoy se mide con la nueva).
create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
  v_today date := local_today();
  v_prev_steps integer;
  v_prev_at timestamptz;
  v_since timestamptz;
  v_allowed integer;
  v_steps integer;
  v_goal integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day > v_today or p_day < v_today - 1 then
    raise exception 'Fecha de sincronización inválida';
  end if;

  select steps, updated_at into v_prev_steps, v_prev_at
  from steps_daily where user_id = p_user_id and day = p_day;

  v_since := coalesce(v_prev_at, (p_day::timestamp at time zone 'America/La_Paz'));
  v_allowed := coalesce(v_prev_steps, 0)
    + 2000
    + floor(greatest(extract(epoch from (now() - v_since)) / 60.0, 0) * 300)::integer;
  v_steps := greatest(0, least(p_steps, v_allowed, 100000));

  select daily_goal into v_goal from profiles where id = p_user_id;

  insert into steps_daily (user_id, day, steps, updated_at, goal)
  values (p_user_id, p_day, v_steps, now(), v_goal)
  on conflict (user_id, day) do update
    set steps = excluded.steps,
        updated_at = now(),
        goal = case when steps_daily.day = v_today then excluded.goal else coalesce(steps_daily.goal, excluded.goal) end;

  perform 1 from steps_daily where user_id = p_user_id and day = p_day for update;

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

-- 2) Cuántas personas usan Camina (solo el número), para mostrar el ranking global desde las 1.000.
create or replace function app_user_count() returns integer
language sql stable security definer set search_path = public
as $$ select count(*)::integer from profiles; $$;

revoke execute on function app_user_count() from public, anon;
grant execute on function app_user_count() to authenticated;
