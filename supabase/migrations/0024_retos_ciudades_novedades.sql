-- Retos que sí pagan puntos, ciudades y barrios, y novedades para comercios -------------

-- ---------- Retos configurables (los edita el equipo de Camina desde el panel) ----------
create table if not exists retos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  description text not null check (char_length(description) between 5 and 160),
  -- referrals: invitar N amigos | steps_streak: N días seguidos con X pasos | weekly_goals: N días de la semana con tu meta diaria
  kind text not null check (kind in ('referrals', 'steps_streak', 'weekly_goals')),
  target integer not null check (target between 1 and 60),
  steps_threshold integer check (steps_threshold between 1000 and 60000),
  reward_points integer not null check (reward_points between 1 and 100),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  check (kind <> 'steps_streak' or steps_threshold is not null)
);
alter table retos enable row level security;

create policy "retos: read active" on retos for select to authenticated using (active or is_admin());
create policy "retos: admin write" on retos for all to authenticated using (is_admin()) with check (is_admin());

create table if not exists reto_claims (
  id uuid primary key default gen_random_uuid(),
  reto_id uuid not null references retos (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  period text not null,
  points integer not null,
  claimed_at timestamptz not null default now(),
  unique (reto_id, user_id, period)
);
alter table reto_claims enable row level security;
create policy "reto_claims: select own" on reto_claims for select to authenticated using (user_id = auth.uid());
-- Solo se escribe con claim_reto().

insert into retos (title, description, kind, target, steps_threshold, reward_points, sort)
select * from (values
  ('Invitá 5 amigos', 'Sumá 5 amigos nuevos a Camina y ganá Puntos extra.', 'referrals', 5, null::integer, 10, 1),
  ('10.000 pasos x 14 días', 'Caminá 10.000 pasos por día durante 14 días seguidos.', 'steps_streak', 14, 10000, 10, 2),
  ('5 metas esta semana', 'Cumplí tu meta diaria 5 veces en la misma semana.', 'weekly_goals', 5, null::integer, 6, 3)
) as v(title, description, kind, target, steps_threshold, reward_points, sort)
where not exists (select 1 from retos);

-- Avance real de un reto para un usuario (siempre calculado en el servidor).
create or replace function _reto_met(r retos, p_user uuid) returns integer as $$
declare
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_week date := date_trunc('week', (now() at time zone 'America/La_Paz'))::date;
  v_goal integer;
  v_cursor date;
  v_streak integer := 0;
begin
  if r.kind = 'referrals' then
    return (select count(*)::int from referrals where referrer_user_id = p_user);
  elsif r.kind = 'weekly_goals' then
    select daily_goal into v_goal from profiles where id = p_user;
    return (select count(*)::int from steps_daily
            where user_id = p_user and day >= v_week and day <= v_today and steps >= coalesce(v_goal, 6000));
  else
    v_cursor := v_today;
    if not exists (select 1 from steps_daily where user_id = p_user and day = v_cursor and steps >= r.steps_threshold) then
      v_cursor := v_cursor - 1;
    end if;
    while v_streak < r.target
      and exists (select 1 from steps_daily where user_id = p_user and day = v_cursor and steps >= r.steps_threshold) loop
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    end loop;
    return v_streak;
  end if;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Período de cobro: define cuándo se puede volver a cobrar el mismo reto.
create or replace function _reto_period(r retos, p_user uuid, p_met integer) returns text as $$
begin
  if r.kind = 'referrals' then
    -- cada grupo completo de N amigos se cobra una vez
    return 'grupo:' || (select count(*) + 1 from reto_claims where reto_id = r.id and user_id = p_user);
  elsif r.kind = 'weekly_goals' then
    return 'semana:' || date_trunc('week', (now() at time zone 'America/La_Paz'))::date;
  else
    return 'racha:' || (now() at time zone 'America/La_Paz')::date;
  end if;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function reto_progress()
returns table (reto_id uuid, met integer, target integer, claimable boolean, claimed_now boolean) as $$
declare
  r retos;
  v_met integer;
  v_claims integer;
  v_recent boolean;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  for r in select * from retos where active order by sort, created_at loop
    v_met := _reto_met(r, auth.uid());
    select count(*) into v_claims from reto_claims where reto_claims.reto_id = r.id and user_id = auth.uid();
    reto_id := r.id;
    target := r.target;
    if r.kind = 'referrals' then
      met := least(v_met - v_claims * r.target, r.target);
      met := greatest(met, 0);
      claimable := v_met >= (v_claims + 1) * r.target;
      claimed_now := false;
    elsif r.kind = 'weekly_goals' then
      met := least(v_met, r.target);
      claimed_now := exists (select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid()
                             and c.period = 'semana:' || date_trunc('week', (now() at time zone 'America/La_Paz'))::date);
      claimable := v_met >= r.target and not claimed_now;
    else
      met := least(v_met, r.target);
      v_recent := exists (select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid()
                          and c.claimed_at > now() - (r.target || ' days')::interval);
      claimed_now := v_recent;
      claimable := v_met >= r.target and not v_recent;
    end if;
    return next;
  end loop;
end;
$$ language plpgsql stable security definer set search_path = public;
grant execute on function reto_progress() to authenticated;

-- Cobra el reto: valida en el servidor y suma los puntos una sola vez.
create or replace function claim_reto(p_reto_id uuid) returns integer as $$
declare
  r retos;
  v_met integer;
  v_claims integer;
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from retos where id = p_reto_id and active for update;
  if r.id is null then
    raise exception 'Ese reto no está disponible.';
  end if;
  v_met := _reto_met(r, auth.uid());
  select count(*) into v_claims from reto_claims where reto_id = r.id and user_id = auth.uid();

  if r.kind = 'referrals' then
    if v_met < (v_claims + 1) * r.target then
      raise exception 'Todavía te faltan amigos para este reto.';
    end if;
  else
    if v_met < r.target then
      raise exception 'Todavía no completaste este reto.';
    end if;
    if r.kind = 'steps_streak' and exists (
      select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid()
        and c.claimed_at > now() - (r.target || ' days')::interval
    ) then
      raise exception 'Ya cobraste este reto. Podés volver a completarlo más adelante.';
    end if;
  end if;

  v_period := _reto_period(r, auth.uid(), v_met);
  insert into reto_claims (reto_id, user_id, period, points) values (r.id, auth.uid(), v_period, r.reward_points)
  on conflict (reto_id, user_id, period) do nothing;
  if not found then
    raise exception 'Ya cobraste este reto.';
  end if;

  insert into points_ledger (user_id, amount, reason, expires_at)
  values (auth.uid(), r.reward_points, 'challenge', now() + (points_ttl_days() || ' days')::interval);

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  values (auth.uid(), '¡Reto cumplido! 🎉', 'Ganaste ' || r.reward_points || ' Puntos por "' || r.title || '".',
          jsonb_build_object('type', 'reto', 'reto_id', r.id), 'reto:' || r.id || ':' || auth.uid() || ':' || v_period)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return r.reward_points;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function claim_reto(uuid) to authenticated;

-- ---------- Ciudades y barrios ----------
create table if not exists cities (
  name text primary key,
  active boolean not null default false,
  sort integer not null default 0
);
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  city text not null references cities (name) on update cascade on delete cascade,
  name text not null,
  unique (city, name)
);
alter table cities enable row level security;
alter table zones enable row level security;
create policy "cities: read" on cities for select using (true);
create policy "zones: read" on zones for select using (true);
create policy "cities: admin write" on cities for all to authenticated using (is_admin()) with check (is_admin());
create policy "zones: admin write" on zones for all to authenticated using (is_admin()) with check (is_admin());

insert into cities (name, active, sort) values
  ('Tarija', true, 1), ('Santa Cruz de la Sierra', false, 2), ('La Paz', false, 3), ('El Alto', false, 4),
  ('Cochabamba', false, 5), ('Sucre', false, 6), ('Oruro', false, 7), ('Potosí', false, 8),
  ('Trinidad', false, 9), ('Cobija', false, 10)
on conflict (name) do nothing;

insert into zones (city, name)
select 'Tarija', z from unnest(array[
  'Centro', 'Las Panosas', 'San Roque', 'El Molino', 'Miraflores', 'Aeropuerto', 'Morros Blancos',
  'Luis Pizarro', 'Juan XXIII', '15 de Abril', 'Senac', 'Catedral', 'Palmarcito', 'Virgen de Fátima',
  'Lourdes', 'Tabladita', 'Los Chapacos', 'Bella Vista', 'Aniceto Arce', 'Panamericano', 'San Jerónimo',
  'Oscar Alfaro', 'La Pampa', 'Simón Bolívar', 'Guadalquivir', 'Torrecillas', 'Cristo Rey', 'Las Lomas',
  'Andalucía', 'San Blas', 'Otra zona de Tarija'
]) as z
on conflict (city, name) do nothing;

alter table profiles add column if not exists city text not null default 'Tarija';
alter table businesses add column if not exists city text not null default 'Tarija';

-- ---------- Novedades para comercios ----------
create table if not exists business_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table business_notifications enable row level security;
create policy "bn: owner read" on business_notifications for select to authenticated
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()));
create policy "bn: owner mark read" on business_notifications for update to authenticated
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()));

create or replace function bn_on_business_approved() returns trigger as $$
begin
  if new.approved and not old.approved then
    insert into business_notifications (business_id, title, body)
    values (new.id, '¡Tu comercio ya está en Camina! 🎉', 'Lo aprobamos: ya aparece en el mapa y en la lista de la app.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists bn_business_approved on businesses;
create trigger bn_business_approved after update of approved on businesses
  for each row execute function bn_on_business_approved();

create or replace function bn_on_redemption() returns trigger as $$
declare
  v_benefit text;
begin
  select name into v_benefit from benefits where id = new.benefit_id;
  if tg_op = 'INSERT' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Alguien generó un canje', 'Una persona va camino a tu local por "' || coalesce(v_benefit, 'un beneficio') || '". Tiene 15 minutos.');
  elsif new.status = 'confirmed' and old.status <> 'confirmed' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Canje confirmado ✅', 'Entregaste "' || coalesce(v_benefit, 'un beneficio') || '".');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists bn_redemption_ins on redemptions;
create trigger bn_redemption_ins after insert on redemptions for each row execute function bn_on_redemption();
drop trigger if exists bn_redemption_upd on redemptions;
create trigger bn_redemption_upd after update of status on redemptions for each row execute function bn_on_redemption();

create or replace function bn_on_campaign() returns trigger as $$
begin
  if new.status <> old.status and new.status = 'sent' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu aviso cercano salió 📣', '"' || new.title || '" llegó a ' || coalesce(new.sent_count, 0) || ' personas.');
  elsif new.status <> old.status and new.status = 'rejected' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu aviso cercano no fue aprobado', 'Revisá el texto de "' || new.title || '" y volvé a pedirlo.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists bn_campaign on nearby_campaigns;
create trigger bn_campaign after update of status on nearby_campaigns for each row execute function bn_on_campaign();
