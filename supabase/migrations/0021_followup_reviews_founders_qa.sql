-- 1) Seguimiento del canje (compró algo más) y link de reseña de Google -------
alter table businesses add column if not exists google_review_url text;

create or replace function answer_redemption_followup(p_redemption_id uuid, p_extra boolean)
returns void as $$
begin
  update redemptions
  set extra_consumption = p_extra
  where id = p_redemption_id
    and user_id = auth.uid()
    and status = 'confirmed'
    and extra_consumption is null;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function answer_redemption_followup(uuid, boolean) to authenticated;

-- 2) Programa fundador: los primeros 20 comercios, 3 meses gratis de Paso Firme -
alter table businesses add column if not exists founder boolean not null default false;
alter table businesses add column if not exists founder_until timestamptz;

-- Solo el equipo de Camina puede tocar estos campos.
create or replace function protect_founder_fields() returns trigger as $$
begin
  if auth.role() = 'authenticated' and not is_admin() then
    new.founder := old.founder;
    new.founder_until := old.founder_until;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists businesses_protect_founder on businesses;
create trigger businesses_protect_founder before update on businesses
  for each row execute function protect_founder_fields();

create or replace function founder_slots_used() returns integer as $$
  select count(*)::int from businesses where founder;
$$ language sql stable security definer set search_path = public;
grant execute on function founder_slots_used() to authenticated;

create or replace function grant_founder(p_business_id uuid) returns businesses as $$
declare
  b businesses;
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede activar el programa fundador.';
  end if;
  if (select count(*) from businesses where founder and id <> p_business_id) >= 20 then
    raise exception 'Los 20 cupos del programa fundador ya están cubiertos.';
  end if;
  update businesses
  set founder = true,
      founder_until = now() + interval '3 months',
      plan = 'paso_firme',
      plan_started_at = now(),
      pending_plan = null
  where id = p_business_id
  returning * into b;
  return b;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function grant_founder(uuid) to authenticated;

-- Al terminar los 3 meses vuelven a Primer Paso (si siguen en Paso Firme por el programa).
create or replace function end_founder_periods() returns void as $$
  update businesses
  set plan = 'primer_paso', plan_started_at = now(), pending_plan = null, founder_until = null
  where founder and founder_until is not null and founder_until < now() and plan = 'paso_firme';
$$ language sql security definer set search_path = public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('end-founder-periods', '30 3 * * *', 'select end_founder_periods()');
  end if;
end $$;

-- 3) Cuentas de prueba (QA): sin espera por comercio ni tope de cupones ---------
create table if not exists qa_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table qa_accounts enable row level security; -- sin policies: solo desde el SQL Editor

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
  v_qa boolean;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  v_qa := exists (select 1 from qa_accounts where user_id = v_user);

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

  if not v_qa then
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

-- Cada cuenta de prueba puede saber que lo es (la app le suma pasos de prueba).
create policy "qa_accounts: select own" on qa_accounts for select using (auth.uid() = user_id);
