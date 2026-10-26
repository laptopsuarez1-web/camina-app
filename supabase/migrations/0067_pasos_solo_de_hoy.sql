-- Los Puntos por pasos cuentan solo el día en curso (hora de La Paz). Antes se aceptaban también los pasos de
-- ayer, y una cuenta creada a la 1 de la mañana recibió Puntos por lo que caminó el día anterior, antes de usar
-- Camina. Ahora ayer no acredita nada ni toca steps_daily; el resto queda igual que en 0063.
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

  -- Solo cuentan los pasos del día en curso (hora de La Paz). Ayer ya no suma: si alguien se crea la cuenta
  -- hoy, los pasos que el teléfono guardó ayer no le dan Puntos. Las versiones de la app que todavía mandan
  -- ayer reciben el saldo sin error (para no cortar la sincronización de hoy que viene después).
  if p_day = v_today - 1 then
    return user_points_balance(p_user_id);
  end if;

  if p_day <> v_today then
    raise exception 'Fecha de sincronización inválida';
  end if;

  -- Curva absoluta: lo permitido depende solo de la hora del día sincronizado, no de la llamada anterior.
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
