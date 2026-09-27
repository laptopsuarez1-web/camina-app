-- Correcciones tras la auditoría de reglas de negocio:
--   1. earn_points_from_steps confiaba en el p_day del cliente sin validarlo:
--      se podía "farmear" Puntos llamando el RPC directo con fechas pasadas
--      inventadas, cada una con su propio tope de 20. Ahora solo acepta hoy
--      o ayer (tolerancia por sincronización tardía), y toma un lock por fila
--      para que dos llamadas concurrentes no dupliquen el crédito del mismo día.
--   2. "Hoy" se calculaba con el huso horario por defecto de Postgres (UTC).
--      Para Bolivia (UTC-4) el corte de día quedaba a las 20:00 hora local.
--      Se fija America/La_Paz para el tope diario, el cupo de beneficios y
--      la ventana horaria de validez.
--   3. El dueño de un comercio podía cambiarse el plan (Bs 100/300) a sí mismo
--      sin pasar por ningún pago, vía update directo a businesses.plan.
--   4. Un código de canje que vence sin ser confirmado dejaba al usuario sin
--      sus Puntos y bloqueado 14 días en ese comercio, sin forma de liberarlo.

create or replace function local_today() returns date as $$
  select (now() at time zone 'America/La_Paz')::date;
$$ language sql stable;

-- ---------- earn_points_from_steps: p_day acotado + lock por fila ----------
create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
  v_today date := local_today();
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day > v_today or p_day < v_today - 1 then
    raise exception 'Fecha de sincronización inválida';
  end if;

  -- Lock por (user_id, day): serializa llamadas concurrentes (dos dispositivos,
  -- doble tap) para que no lean el mismo "ya ganado" antes de que la otra escriba.
  insert into steps_daily (user_id, day, steps, updated_at)
  values (p_user_id, p_day, p_steps, now())
  on conflict (user_id, day) do update set steps = excluded.steps, updated_at = now();

  perform 1 from steps_daily where user_id = p_user_id and day = p_day for update;

  v_target_points := least(floor(p_steps / 1000.0)::integer, v_cap);

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

-- ---------- redeem_benefit: cupo diario y horario en hora local ----------
create or replace function redeem_benefit(p_benefit_id uuid) returns redemptions as $$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_balance integer;
  v_cooldown_until timestamptz;
  v_now timestamptz := now();
  v_local_time time := (v_now at time zone 'America/La_Paz')::time;
  v_dow smallint;
  v_row redemptions;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  select * into v_benefit from benefits where id = p_benefit_id and active for update;
  if not found then
    raise exception 'Beneficio no disponible';
  end if;

  v_dow := extract(isodow from (v_now at time zone 'America/La_Paz'))::smallint - 1;
  if (v_benefit.valid_days_mask & (1 << v_dow)) = 0 then
    raise exception 'Este beneficio no está disponible hoy';
  end if;
  if v_benefit.valid_from is not null and v_benefit.valid_to is not null then
    if v_benefit.valid_from <= v_benefit.valid_to then
      if not (v_local_time between v_benefit.valid_from and v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    else
      if not (v_local_time >= v_benefit.valid_from or v_local_time <= v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    end if;
  end if;

  select max(created_at) into v_cooldown_until
  from redemptions
  where user_id = v_user
    and business_id = v_benefit.business_id
    and status in ('pending', 'confirmed')
    and created_at > v_now - (business_redemption_cooldown_days() || ' days')::interval;
  if v_cooldown_until is not null then
    raise exception 'Ya canjeaste en este comercio hace menos de % días', business_redemption_cooldown_days();
  end if;

  if (select count(*) from redemptions
      where benefit_id = p_benefit_id
        and status in ('pending', 'confirmed')
        and (created_at at time zone 'America/La_Paz')::date = local_today()) >= v_benefit.daily_quota then
    raise exception 'Se agotaron los cupones de hoy para este beneficio';
  end if;

  v_balance := user_points_balance(v_user);
  if v_balance < v_benefit.cost_points then
    raise exception 'Saldo insuficiente';
  end if;

  insert into points_ledger (user_id, amount, reason)
  values (v_user, -v_benefit.cost_points, 'redemption');

  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_benefit.cost_points,
    generate_redemption_code(), v_now + (redemption_code_ttl_minutes() || ' minutes')::interval
  )
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- cancel_expired_redemption: devuelve los Puntos de un código vencido ----------
-- Al pasar a 'cancelled' también libera el cooldown de 14 días en ese comercio,
-- porque redeem_benefit solo cuenta 'pending'/'confirmed' al revisar el cooldown.
create or replace function cancel_expired_redemption(p_redemption_id uuid) returns redemptions as $$
declare
  v_row redemptions%rowtype;
begin
  select * into v_row from redemptions
  where id = p_redemption_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Canje no encontrado';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Este canje ya no está pendiente';
  end if;
  if v_row.code_expires_at > now() then
    raise exception 'Este código todavía no venció';
  end if;

  update redemptions set status = 'cancelled' where id = v_row.id returning * into v_row;

  insert into points_ledger (user_id, amount, reason)
  values (v_row.user_id, v_row.cost_points, 'redemption');

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Bloqueo de auto-upgrade de plan ----------
-- El dueño de un comercio sigue pudiendo editar nombre/dirección/horario/etc.
-- (política "businesses: owner manages"), pero no puede cambiar su propio
-- plan: sin pasarela de pago todavía, el cambio de plan lo tiene que aplicar
-- alguien del equipo de Camina desde el SQL editor de Supabase (rol distinto
-- de 'authenticated', así que este trigger no lo bloquea) una vez confirmado
-- el pago. auth.role() devuelve null fuera de una request autenticada vía API
-- (consola SQL, service_role), así que solo alcanza a los clientes reales.
create or replace function prevent_self_plan_change() returns trigger as $$
begin
  if new.plan is distinct from old.plan and auth.role() = 'authenticated' then
    raise exception 'El cambio de plan requiere confirmar el pago con Camina — todavía no está disponible de forma automática.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists businesses_prevent_self_plan_change on businesses;
create trigger businesses_prevent_self_plan_change
  before update on businesses
  for each row execute function prevent_self_plan_change();
