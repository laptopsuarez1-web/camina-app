-- Dos pedidos reales del dueño de comercio:
-- 1) Los planes pagos prometen "Varios beneficios a la vez" pero el panel
--    solo dejaba cargar y ver UN beneficio (beneficio/page.tsx hacía
--    .limit(1).maybeSingle()). Eso era un límite de la UI, no de la base:
--    enforce_benefit_plan_rules() ya solo restringe a 1 beneficio activo
--    para el plan gratis. La UI se arregla en esta misma tarea.
-- 2) Los planes pagos también prometen "Cupones ilimitados" pero
--    daily_quota era not null — no había forma de representar "sin límite".
--    Se permite null = ilimitado (nunca para el plan gratis, que sigue
--    necesitando el mínimo de 3).

alter table benefits alter column daily_quota drop not null;
alter table benefits drop constraint if exists benefits_daily_quota_check;
alter table benefits add constraint benefits_daily_quota_check check (daily_quota is null or daily_quota >= 0);

create or replace function enforce_benefit_plan_rules() returns trigger as $$
declare
  plan business_plan;
  active_count integer;
begin
  select b.plan into plan from businesses b where b.id = new.business_id;

  if plan = 'primer_paso' then
    if new.type <> 'gratis' then
      raise exception 'El plan Primer Paso solo admite beneficios gratis';
    end if;
    if new.daily_quota is null or new.daily_quota < 3 then
      raise exception 'El plan Primer Paso requiere un mínimo de 3 cupones por día';
    end if;
    if new.active then
      select count(*) into active_count from benefits
        where business_id = new.business_id and active and id <> coalesce(new.id, gen_random_uuid());
      if active_count >= 1 then
        raise exception 'El plan Primer Paso permite un solo beneficio activo a la vez';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

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

  if v_benefit.daily_quota is not null and (select count(*) from redemptions
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
