-- Eventos con más datos (como en Pasito): varias fotos, dónde queda y cómo conseguir entradas.
--   * photos: hasta 8 fotos extra (se ven al abrir el evento o desafío)
--   * place_name / place_address / place_url: dónde queda y link a Google Maps ("Cómo llegar")
--   * entradas (solo eventos), tres caminos que elige el organizador:
--       - libre: sin precio ni Puntos -> "Anotarme" (o, si puso link, "Consultar")
--       - con Puntos: ticket_points + ticket_quota (cupo) -> la persona canjea y se descuentan al instante
--       - con plata: ticket_price ("Bs 30") + ticket_url (WhatsApp, web...) -> "Comprar desde Bs 30"
--     Si se agotan las de Puntos y puso precio y link, la app ofrece comprar con plata.
-- request_promotion_v2 (0061) no cambia: la v3 la llama y después guarda estos datos.

alter table promotions add column if not exists photos text[] not null default '{}';
alter table promotions add column if not exists place_name text check (place_name is null or char_length(place_name) <= 80);
alter table promotions add column if not exists place_address text check (place_address is null or char_length(place_address) <= 160);
alter table promotions add column if not exists place_url text check (place_url is null or char_length(place_url) <= 300);
alter table promotions add column if not exists ticket_price text check (ticket_price is null or char_length(ticket_price) <= 40);
alter table promotions add column if not exists ticket_url text check (ticket_url is null or char_length(ticket_url) <= 300);
alter table promotions add column if not exists ticket_points integer check (ticket_points is null or ticket_points between 1 and 5000);
alter table promotions add column if not exists ticket_quota integer check (ticket_quota is null or ticket_quota between 1 and 5000);
alter table promotions drop constraint if exists promotions_ticket_chk;
alter table promotions add constraint promotions_ticket_chk check (ticket_points is null or ticket_quota is not null);

-- Entradas canjeadas con Puntos (una por persona y evento).
create table if not exists promotion_tickets (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (promotion_id, user_id)
);
alter table promotion_tickets enable row level security;
drop policy if exists "tickets: select own" on promotion_tickets;
create policy "tickets: select own" on promotion_tickets for select using (auth.uid() = user_id);
alter table promotions drop constraint if exists promotions_photos_chk;
alter table promotions add constraint promotions_photos_chk check (cardinality(photos) <= 8);

create or replace function request_promotion_v3(
  p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_goal_mode text, p_goal_steps integer, p_goal_days integer, p_winners integer,
  p_bg_color text, p_bg_image_url text, p_cta_url text, p_bg_logo boolean,
  p_photos text[], p_place_name text, p_place_address text, p_place_url text,
  p_ticket_price text, p_ticket_url text, p_ticket_points integer default null, p_ticket_quota integer default null
) returns promotions as $$
declare
  r promotions;
  v_photos text[] := coalesce(p_photos, '{}');
  v_place_url text := nullif(btrim(coalesce(p_place_url, '')), '');
  v_ticket_url text := nullif(btrim(coalesce(p_ticket_url, '')), '');
  v_ticket_price text := nullif(btrim(coalesce(p_ticket_price, '')), '');
begin
  if p_kind = 'publicidad' and (cardinality(v_photos) > 0 or v_place_url is not null or nullif(btrim(coalesce(p_place_name, '')), '') is not null
                                or v_ticket_url is not null or v_ticket_price is not null or p_ticket_points is not null) then
    raise exception 'El banner solo lleva imagen y link.';
  end if;
  if cardinality(v_photos) > 8 then
    raise exception 'Hasta 8 fotos.';
  end if;
  if exists (select 1 from unnest(v_photos) u where u !~ '^https://' or char_length(u) > 500) then
    raise exception 'Alguna foto no es válida.';
  end if;
  if (v_place_url is not null and v_place_url !~ '^https://') or (v_ticket_url is not null and v_ticket_url !~ '^https://') then
    raise exception 'Los links tienen que empezar con https://';
  end if;
  if p_kind <> 'evento' and (v_ticket_url is not null or v_ticket_price is not null or p_ticket_points is not null) then
    raise exception 'Solo los eventos llevan entradas.';
  end if;
  if p_ticket_points is not null and (p_ticket_points < 1 or p_ticket_quota is null or p_ticket_quota < 1) then
    raise exception 'Para entradas con Puntos poné cuántos Puntos cuestan y cuántas entradas hay.';
  end if;
  if v_ticket_price is not null and v_ticket_url is null then
    raise exception 'Para vender entradas poné un contacto o link de compra.';
  end if;
  r := request_promotion_v2(
    p_business_id, p_kind, p_title, p_description, p_prize, p_starts_at, p_ends_at,
    p_goal_mode, p_goal_steps, p_goal_days, p_winners, p_bg_color, p_bg_image_url, p_cta_url, p_bg_logo
  );
  update promotions set
    photos = v_photos,
    place_name = nullif(btrim(coalesce(p_place_name, '')), ''),
    place_address = nullif(btrim(coalesce(p_place_address, '')), ''),
    place_url = v_place_url,
    ticket_price = v_ticket_price,
    ticket_url = v_ticket_url,
    ticket_points = p_ticket_points,
    ticket_quota = case when p_ticket_points is not null then p_ticket_quota end
  where id = r.id
  returning * into r;
  return r;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function request_promotion_v3(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text, boolean, text[], text, text, text, text, text, integer, integer) from public, anon;
grant execute on function request_promotion_v3(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text, boolean, text[], text, text, text, text, text, integer, integer) to authenticated;

-- Canjear una entrada con Puntos. Los Puntos se descuentan al instante (el organizador no confirma nada),
-- con el mismo candado por persona que redeem_benefit para que dos canjes a la vez no lean el mismo saldo.
create or replace function redeem_event_ticket(p_id uuid) returns promotion_tickets as $$
declare
  v_user uuid := auth.uid();
  r promotions;
  v_bname text;
  v_row promotion_tickets;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  -- El candado del evento ordena los canjes de distintas personas: el cupo nunca se pasa.
  select * into r from promotions where id = p_id and status = 'approved' and kind = 'evento' for update;
  if r.id is null or now() > r.ends_at or r.ticket_points is null then
    raise exception 'Este evento no tiene entradas con Puntos.';
  end if;
  if exists (select 1 from promotion_tickets where promotion_id = p_id and user_id = v_user) then
    raise exception 'Ya tenés tu entrada.';
  end if;
  if (select count(*) from promotion_tickets where promotion_id = p_id) >= r.ticket_quota then
    raise exception 'Se agotaron las entradas con Puntos.';
  end if;
  if user_points_balance(v_user) - user_points_reserved(v_user) < r.ticket_points then
    raise exception 'Saldo insuficiente';
  end if;
  select name into v_bname from businesses where id = r.business_id;
  insert into points_ledger (user_id, amount, reason, note)
    values (v_user, -r.ticket_points, 'redemption', 'Entrada: ' || r.title || ' (' || coalesce(v_bname, 'un comercio') || ')');
  insert into promotion_tickets (promotion_id, user_id, points) values (p_id, v_user, r.ticket_points) returning * into v_row;
  insert into promotion_entries (promotion_id, user_id) values (p_id, v_user) on conflict do nothing;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function redeem_event_ticket(uuid) from public, anon;
grant execute on function redeem_event_ticket(uuid) to authenticated;

-- Cuántas entradas con Puntos ya se canjearon (la tabla solo la ve cada persona).
create or replace function promotion_ticket_counts() returns table (promotion_id uuid, taken integer) as $$
  select t.promotion_id, count(*)::integer
  from promotion_tickets t join promotions p on p.id = t.promotion_id
  where p.status = 'approved'
  group by t.promotion_id;
$$ language sql stable security definer set search_path = public;
revoke execute on function promotion_ticket_counts() from public, anon;
grant execute on function promotion_ticket_counts() to authenticated;

-- El organizador ve quién tiene entrada (nombre y cuándo la canjeó).
create or replace function promotion_ticket_holders(p_id uuid) returns table (full_name text, created_at timestamptz) as $$
  select p.full_name, t.created_at from promotion_tickets t
  join profiles p on p.id = t.user_id
  join promotions r on r.id = t.promotion_id
  join businesses b on b.id = r.business_id
  where t.promotion_id = p_id and (is_admin() or b.owner_user_id = auth.uid())
  order by t.created_at;
$$ language sql stable security definer set search_path = public;
revoke execute on function promotion_ticket_holders(uuid) from public, anon;
grant execute on function promotion_ticket_holders(uuid) to authenticated;
