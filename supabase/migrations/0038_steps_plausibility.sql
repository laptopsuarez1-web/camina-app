-- Antitrampa en el servidor: el cliente puede mandar cualquier número de pasos.
-- Se limita (sin dar error, para no romper la app) a lo que una persona puede
-- caminar desde la última sincronización: 300 pasos por minuto + 2.000 de margen,
-- con tope de 100.000 al día. El tope de Puntos por día (daily_points_cap) no cambia.
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
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day > v_today or p_day < v_today - 1 then
    raise exception 'Fecha de sincronización inválida';
  end if;

  select steps, updated_at into v_prev_steps, v_prev_at
  from steps_daily where user_id = p_user_id and day = p_day;

  -- Desde cuándo se cuentan los pasos nuevos: la última sincronización del día o la medianoche de La Paz.
  v_since := coalesce(v_prev_at, (p_day::timestamp at time zone 'America/La_Paz'));
  v_allowed := coalesce(v_prev_steps, 0)
    + 2000
    + floor(greatest(extract(epoch from (now() - v_since)) / 60.0, 0) * 300)::integer;
  v_steps := greatest(0, least(p_steps, v_allowed, 100000));

  insert into steps_daily (user_id, day, steps, updated_at)
  values (p_user_id, p_day, v_steps, now())
  on conflict (user_id, day) do update set steps = excluded.steps, updated_at = now();

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
