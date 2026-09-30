-- Eventos y sorteos (publicación aparte, con vigencia máxima de 2 semanas) ---------------------

-- Tipo de cuenta: comercio (canjes) o "solo eventos y sorteos" (publicidad sin estar en el mapa).
alter table businesses add column if not exists account_kind text not null default 'commerce'
  check (account_kind in ('commerce', 'events_only'));

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  kind text not null check (kind in ('evento', 'sorteo')),
  title text not null check (char_length(title) between 3 and 60),
  description text not null check (char_length(description) between 5 and 400),
  prize text check (prize is null or char_length(prize) <= 120),
  winners_count integer not null default 3 check (winners_count between 1 and 10),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Condición para participar (se verifica en el servidor al sortear).
  req_steps integer check (req_steps is null or req_steps between 1000 and 60000),
  req_days integer check (req_days is null or req_days between 1 and 14),
  price_bs integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'finished')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (ends_at > starts_at and ends_at <= starts_at + interval '14 days'),
  check ((req_steps is null) = (req_days is null))
);
alter table promotions enable row level security;

-- La gente ve las aprobadas o terminadas; el comercio ve las suyas; el equipo ve todas.
create policy "promotions: read" on promotions for select to authenticated
  using (
    status in ('approved', 'finished')
    or is_admin()
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );
-- Escribir solo con las funciones de abajo.

create table if not exists promotion_entries (
  promotion_id uuid not null references promotions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (promotion_id, user_id)
);
alter table promotion_entries enable row level security;
create policy "entries: select own" on promotion_entries for select to authenticated
  using (user_id = auth.uid() or is_admin());

create table if not exists promotion_winners (
  promotion_id uuid not null references promotions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  drawn_at timestamptz not null default now(),
  primary key (promotion_id, user_id)
);
alter table promotion_winners enable row level security;
create policy "winners: read" on promotion_winners for select to authenticated using (true);

-- Precio: Bs 200 si el comercio ya está en Camina, Bs 400 si es solo publicidad.
create or replace function promotion_price(p_kind text) returns integer as $$
  select case when p_kind = 'events_only' then 400 else 200 end;
$$ language sql immutable;

create or replace function request_promotion(
  p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text,
  p_starts_at timestamptz, p_ends_at timestamptz, p_req_steps integer, p_req_days integer, p_winners integer
) returns promotions as $$
declare
  b businesses;
  r promotions;
begin
  select * into b from businesses where id = p_business_id and owner_user_id = auth.uid();
  if b.id is null then
    raise exception 'No autorizado';
  end if;
  if not b.approved then
    raise exception 'Tu cuenta todavía está en revisión.';
  end if;
  if p_ends_at > p_starts_at + interval '14 days' then
    raise exception 'La vigencia máxima es de 2 semanas.';
  end if;
  if p_starts_at < now() - interval '1 hour' then
    raise exception 'La fecha de inicio ya pasó.';
  end if;
  insert into promotions (business_id, kind, title, description, prize, winners_count, starts_at, ends_at, req_steps, req_days, price_bs)
  values (p_business_id, p_kind, btrim(p_title), btrim(p_description), nullif(btrim(coalesce(p_prize, '')), ''),
          least(greatest(coalesce(p_winners, 3), 1), 10), p_starts_at, p_ends_at, p_req_steps, p_req_days,
          promotion_price(b.account_kind))
  returning * into r;
  return r;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function request_promotion(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer, integer) to authenticated;

create or replace function decide_promotion(p_id uuid, p_approve boolean) returns void as $$
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede decidir.';
  end if;
  update promotions
     set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
   where id = p_id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function decide_promotion(uuid, boolean) to authenticated;

-- La persona se anota (una sola vez) mientras la publicación está vigente.
create or replace function join_promotion(p_id uuid) returns void as $$
declare
  r promotions;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from promotions where id = p_id and status = 'approved';
  if r.id is null or now() < r.starts_at or now() > r.ends_at then
    raise exception 'Esta publicación no está vigente.';
  end if;
  insert into promotion_entries (promotion_id, user_id) values (p_id, auth.uid())
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function join_promotion(uuid) to authenticated;

-- ¿Cumplió la persona la condición? (X días de la ventana con al menos Y pasos)
create or replace function _promotion_eligible(r promotions, p_user uuid) returns boolean as $$
  select r.req_steps is null or (
    select count(*) from steps_daily s
    where s.user_id = p_user
      and s.day >= (r.starts_at at time zone 'America/La_Paz')::date
      and s.day <= (r.ends_at at time zone 'America/La_Paz')::date
      and s.steps >= r.req_steps
  ) >= r.req_days;
$$ language sql stable security definer set search_path = public;

-- Sorteo al azar entre quienes se anotaron y cumplieron la condición (solo el equipo de Camina, una vez).
create or replace function draw_promotion(p_id uuid) returns table (user_id uuid, full_name text) as $$
declare
  r promotions;
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede sortear.';
  end if;
  select * into r from promotions where id = p_id and status = 'approved' for update;
  if r.id is null then
    raise exception 'Publicación no encontrada o ya sorteada.';
  end if;
  if now() < r.ends_at then
    raise exception 'Todavía no terminó la vigencia.';
  end if;

  insert into promotion_winners (promotion_id, user_id)
  select p_id, e.user_id
  from promotion_entries e
  where e.promotion_id = p_id and _promotion_eligible(r, e.user_id)
  order by random()
  limit r.winners_count;

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select w.user_id, '¡Ganaste! 🎉', 'Ganaste en "' || r.title || '". Te vamos a contactar para entregarte el premio.',
         jsonb_build_object('type', 'promotion_win', 'promotion_id', p_id), 'promo_win:' || p_id || ':' || w.user_id
  from promotion_winners w where w.promotion_id = p_id
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  update promotions set status = 'finished' where id = p_id;

  return query
    select w.user_id, p.full_name from promotion_winners w join profiles p on p.id = w.user_id where w.promotion_id = p_id;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function draw_promotion(uuid) to authenticated;

-- Novedad para el comercio cuando se decide su publicación.
create or replace function bn_on_promotion() returns trigger as $$
begin
  if new.status <> old.status and new.status = 'approved' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu publicación fue aprobada ✅', '"' || new.title || '" ya se ve en la app.');
  elsif new.status <> old.status and new.status = 'rejected' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu publicación no fue aprobada', 'Escribinos por WhatsApp para ajustarla: "' || new.title || '".');
  elsif new.status <> old.status and new.status = 'finished' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Se hizo el sorteo 🎉', 'Sorteamos "' || new.title || '". Camina te pasa los ganadores para que les entregues el premio.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists bn_promotion on promotions;
create trigger bn_promotion after update of status on promotions for each row execute function bn_on_promotion();

-- El comercio ve los ganadores de sus propias publicaciones (nombre solamente).
create or replace function promotion_winner_names(p_id uuid) returns table (full_name text) as $$
  select p.full_name from promotion_winners w
  join profiles p on p.id = w.user_id
  join promotions r on r.id = w.promotion_id
  join businesses b on b.id = r.business_id
  where w.promotion_id = p_id and (is_admin() or b.owner_user_id = auth.uid());
$$ language sql stable security definer set search_path = public;
grant execute on function promotion_winner_names(uuid) to authenticated;
