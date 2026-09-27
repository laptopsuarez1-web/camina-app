-- Camina — schema inicial
-- Reglas de negocio que este archivo aplica del lado del servidor:
--   * 1 Punto cada 1000 pasos, tope de 20 Puntos ganados por usuario por día.
--   * Los Puntos vencen a los 90 días de haberse ganado (ver DEFAULT_POINTS_TTL_DAYS).
--   * No se puede volver a canjear en el mismo comercio hasta pasados 14 días.
--   * El código de canje tiene 6 dígitos y vence a los 15 minutos.
-- Todo esto vive en funciones security definer para que el cliente (app o panel)
-- nunca pueda manipular el balance o saltarse el cooldown directamente.

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type business_plan as enum ('primer_paso', 'paso_firme', 'paso_adelante');
create type benefit_type as enum ('gratis', 'descuento');
create type redemption_status as enum ('pending', 'confirmed', 'expired', 'cancelled');
create type points_reason as enum ('steps', 'referral', 'challenge', 'redemption');

-- ---------- PROFILES ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  zone text,
  interests text[] not null default '{}',
  photo_url text,
  daily_goal integer not null default 6000,
  ranking_visible boolean not null default true,
  dark_mode boolean not null default false,
  referred_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: select own" on profiles for select
  using (auth.uid() = id);
create policy "profiles: update own" on profiles for update
  using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert
  with check (auth.uid() = id);

-- Perfil público mínimo para rankings de grupo (nombre + foto), sin exponer el resto.
create view public_profiles as
  select id, full_name, photo_url from profiles;

-- ---------- BUSINESSES (comercios) ----------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  category text not null,
  description text,
  address text,
  phone text,
  instagram text,
  hours_text text,
  lat double precision,
  lng double precision,
  logo_url text,
  plan business_plan not null default 'primer_paso',
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;

create policy "businesses: public read" on businesses for select
  using (true);
create policy "businesses: owner manages" on businesses for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ---------- BENEFITS (beneficios/canjes que ofrece cada comercio) ----------
create table benefits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  type benefit_type not null default 'gratis',
  discount_detail text,
  cost_points integer not null check (cost_points > 0),
  daily_quota integer not null default 3 check (daily_quota >= 0),
  active boolean not null default true,
  valid_from time,
  valid_to time,
  valid_days_mask smallint not null default 127, -- bit 0=lunes ... bit 6=domingo, 127 = todos los días
  created_at timestamptz not null default now()
);

alter table benefits enable row level security;

create policy "benefits: public read active" on benefits for select
  using (active or exists (
    select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()
  ));
create policy "benefits: owner manages" on benefits for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()));

-- Plan gratuito ("Primer Paso"): un solo beneficio activo, 100% gratis, mínimo 3 cupones/día.
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
    if new.daily_quota < 3 then
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

create trigger benefits_plan_rules
  before insert or update on benefits
  for each row execute function enforce_benefit_plan_rules();

-- ---------- STEPS (pasos diarios por usuario, agregados por día) ----------
create table steps_daily (
  user_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  steps integer not null default 0 check (steps >= 0),
  source text not null default 'device', -- healthkit | google_fit | manual
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table steps_daily enable row level security;

create policy "steps: select own" on steps_daily for select
  using (auth.uid() = user_id);
create policy "steps: upsert own" on steps_daily for insert
  with check (auth.uid() = user_id);
create policy "steps: update own" on steps_daily for update
  using (auth.uid() = user_id);

-- ---------- POINTS LEDGER ----------
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  amount integer not null, -- positivo = ganado, negativo = gastado
  reason points_reason not null,
  ref_day date, -- día de pasos que originó el punto (reason = 'steps')
  earned_at timestamptz not null default now(),
  expires_at timestamptz -- solo se setea en entradas positivas
);

alter table points_ledger enable row level security;

create policy "ledger: select own" on points_ledger for select
  using (auth.uid() = user_id);
-- Sin policy de insert/update para clientes: solo las funciones security definer escriben acá.

create index points_ledger_user_idx on points_ledger (user_id, earned_at);

create or replace function user_points_balance(p_user_id uuid) returns integer as $$
  select coalesce(sum(amount), 0)::integer
  from points_ledger
  where user_id = p_user_id
    and (amount < 0 or expires_at is null or expires_at > now());
$$ language sql stable;

-- Puntos ganados hoy (solo reason='steps'), para aplicar el tope de 20/día.
create or replace function points_earned_today(p_user_id uuid) returns integer as $$
  select coalesce(sum(amount), 0)::integer
  from points_ledger
  where user_id = p_user_id
    and reason = 'steps'
    and ref_day = current_date;
$$ language sql stable;

-- Vigencia de un lote de Puntos ganado por pasos.
create or replace function points_ttl_days() returns integer as $$
  select 90;
$$ language sql immutable;

-- Tope diario de Puntos ganables por pasos.
create or replace function daily_points_cap() returns integer as $$
  select 20;
$$ language sql immutable;

-- Cooldown (en días) para volver a canjear en el mismo comercio.
create or replace function business_redemption_cooldown_days() returns integer as $$
  select 14;
$$ language sql immutable;

-- Vencimiento del código de canje, en minutos.
create or replace function redemption_code_ttl_minutes() returns integer as $$
  select 15;
$$ language sql immutable;

-- ---------- earn_points_from_steps ----------
-- Se llama cuando el dispositivo sincroniza pasos del día (HealthKit / Google Fit).
-- Es idempotente: recalcula cuántos Puntos corresponden a los pasos totales del día
-- y solo acredita la diferencia contra lo ya ganado hoy, respetando el tope diario.
create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  insert into steps_daily (user_id, day, steps, updated_at)
  values (p_user_id, p_day, p_steps, now())
  on conflict (user_id, day) do update set steps = excluded.steps, updated_at = now();

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

-- ---------- REDEMPTIONS ----------
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  benefit_id uuid not null references benefits (id),
  business_id uuid not null references businesses (id),
  cost_points integer not null,
  code text not null,
  code_expires_at timestamptz not null,
  status redemption_status not null default 'pending',
  extra_consumption boolean,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table redemptions enable row level security;

create policy "redemptions: select own or business owner" on redemptions for select
  using (
    auth.uid() = user_id
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );
-- Sin policy de insert/update directa: todo pasa por las funciones de abajo.

create index redemptions_user_idx on redemptions (user_id, business_id, created_at);
create index redemptions_code_idx on redemptions (business_id, code, status);

create or replace function generate_redemption_code() returns text as $$
  select lpad(floor(random() * 1000000)::text, 6, '0');
$$ language sql volatile;

-- ---------- redeem_benefit ----------
-- Valida balance, horario/día de vigencia del beneficio y el cooldown de 14 días
-- por comercio antes de descontar Puntos y generar el código.
create or replace function redeem_benefit(p_benefit_id uuid) returns redemptions as $$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_balance integer;
  v_cooldown_until timestamptz;
  v_now timestamptz := now();
  v_dow smallint; -- 0=lunes ... 6=domingo
  v_row redemptions;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  select * into v_benefit from benefits where id = p_benefit_id and active for update;
  if not found then
    raise exception 'Beneficio no disponible';
  end if;

  v_dow := extract(isodow from v_now)::smallint - 1;
  if (v_benefit.valid_days_mask & (1 << v_dow)) = 0 then
    raise exception 'Este beneficio no está disponible hoy';
  end if;
  if v_benefit.valid_from is not null and v_benefit.valid_to is not null then
    if v_benefit.valid_from <= v_benefit.valid_to then
      if not (v_now::time between v_benefit.valid_from and v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    else
      if not (v_now::time >= v_benefit.valid_from or v_now::time <= v_benefit.valid_to) then
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

  -- cupo diario del beneficio (cuenta canjes confirmados+pendientes de hoy, de cualquier usuario)
  if (select count(*) from redemptions
      where benefit_id = p_benefit_id
        and status in ('pending', 'confirmed')
        and created_at::date = v_now::date) >= v_benefit.daily_quota then
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

-- ---------- regenerate_redemption_code ----------
create or replace function regenerate_redemption_code(p_redemption_id uuid) returns redemptions as $$
declare
  v_row redemptions;
begin
  update redemptions
  set code = generate_redemption_code(),
      code_expires_at = now() + (redemption_code_ttl_minutes() || ' minutes')::interval
  where id = p_redemption_id and user_id = auth.uid() and status = 'pending'
  returning * into v_row;

  if not found then
    raise exception 'No se puede regenerar este código';
  end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- confirm_redemption_code ----------
-- La llama el panel de comercios cuando el empleado tipea el código de 6 dígitos.
create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $$
declare
  v_row redemptions;
begin
  if not exists (select 1 from businesses where id = p_business_id and owner_user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select * into v_row from redemptions
  where business_id = p_business_id and code = p_code
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Código no encontrado';
  end if;

  if v_row.status = 'confirmed' then
    raise exception 'Ese código ya fue confirmado';
  end if;

  if v_row.status <> 'pending' or v_row.code_expires_at < now() then
    update redemptions set status = 'expired' where id = v_row.id;
    raise exception 'Ese código ya venció';
  end if;

  update redemptions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- GROUPS ----------
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles (id),
  challenge_target integer not null default 200000,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id),
  text text not null,
  created_at timestamptz not null default now()
);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_notes enable row level security;

create policy "groups: members read" on groups for select
  using (exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid()) or true);
  -- lectura pública para poder listar "grupos para unirte"; el detalle sensible vive en notes/members
create policy "groups: authenticated create" on groups for insert
  with check (auth.uid() = created_by);

create policy "group_members: members read" on group_members for select
  using (exists (select 1 from group_members m2 where m2.group_id = group_id and m2.user_id = auth.uid()));
create policy "group_members: self join" on group_members for insert
  with check (auth.uid() = user_id);

create policy "group_notes: members read" on group_notes for select
  using (exists (select 1 from group_members m where m.group_id = group_id and m.user_id = auth.uid()));
create policy "group_notes: members write" on group_notes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from group_members m where m.group_id = group_id and m.user_id = auth.uid())
  );

-- ---------- REFERRALS ----------
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references profiles (id),
  referred_user_id uuid not null references profiles (id) unique,
  credited boolean not null default false,
  created_at timestamptz not null default now()
);

alter table referrals enable row level security;
create policy "referrals: select own" on referrals for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- Acredita 5 Puntos al referente la primera vez que el referido gana puntos por pasos.
create or replace function credit_referral_on_first_points() returns trigger as $$
declare
  v_ref referrals%rowtype;
begin
  if new.reason = 'steps' then
    select * into v_ref from referrals
    where referred_user_id = new.user_id and credited = false;
    if found then
      insert into points_ledger (user_id, amount, reason, expires_at)
      values (v_ref.referrer_user_id, 5, 'referral', now() + (points_ttl_days() || ' days')::interval);
      update referrals set credited = true where id = v_ref.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger points_ledger_referral_credit
  after insert on points_ledger
  for each row execute function credit_referral_on_first_points();
