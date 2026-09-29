-- Avisos push por cercanía (plan Paso Adelante) ---------------------------------
-- Privacidad: solo se guarda una ubicación APROXIMADA (celda de ~550 m), nunca el historial ni la ruta.

alter table profiles add column if not exists nearby_alerts boolean not null default true;

create table if not exists user_locations (
  user_id uuid primary key references profiles (id) on delete cascade,
  lat_r double precision not null,
  lng_r double precision not null,
  updated_at timestamptz not null default now()
);
alter table user_locations enable row level security;
-- Sin policies: solo se escribe con save_coarse_location() y solo la lee el servidor.

-- Guarda (o borra, si viene null) la ubicación aproximada de quien llama.
create or replace function save_coarse_location(p_lat double precision, p_lng double precision) returns void as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  if p_lat is null or p_lng is null then
    delete from user_locations where user_id = auth.uid();
    return;
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and nearby_alerts) then
    delete from user_locations where user_id = auth.uid();
    return;
  end if;
  insert into user_locations (user_id, lat_r, lng_r, updated_at)
  values (auth.uid(), round(p_lat / 0.005) * 0.005, round(p_lng / 0.005) * 0.005, now())
  on conflict (user_id) do update
    set lat_r = excluded.lat_r, lng_r = excluded.lng_r, updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function save_coarse_location(double precision, double precision) to authenticated;

create table if not exists nearby_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 40),
  body text not null check (char_length(body) between 5 and 120),
  radius_km numeric not null check (radius_km between 0.5 and 5),
  status text not null default 'pending' check (status in ('pending', 'sent', 'rejected')),
  sent_count integer,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table nearby_campaigns enable row level security;

create policy "nearby: owner or admin read" on nearby_campaigns for select
  using (
    is_admin()
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );
-- Escribir solo con las funciones de abajo.

-- El comercio (solo Paso Adelante, aprobado) pide un aviso: máximo 3 pedidos por mes.
create or replace function request_nearby_campaign(p_business_id uuid, p_title text, p_body text, p_radius_km numeric)
returns nearby_campaigns as $$
declare
  b businesses;
  c nearby_campaigns;
begin
  select * into b from businesses where id = p_business_id and owner_user_id = auth.uid();
  if b.id is null then
    raise exception 'No autorizado';
  end if;
  if b.plan <> 'paso_adelante' then
    raise exception 'Los avisos por cercanía son parte del plan Paso Adelante.';
  end if;
  if not b.approved then
    raise exception 'Tu comercio todavía está en revisión.';
  end if;
  if b.lat is null or b.lng is null then
    raise exception 'Cargá la ubicación de tu local en el Perfil antes de enviar avisos.';
  end if;
  if (select count(*) from nearby_campaigns
      where business_id = p_business_id and created_at > now() - interval '30 days') >= 3 then
    raise exception 'Ya usaste los 3 avisos de este mes.';
  end if;
  insert into nearby_campaigns (business_id, title, body, radius_km)
  values (p_business_id, btrim(p_title), btrim(p_body), p_radius_km)
  returning * into c;
  return c;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function request_nearby_campaign(uuid, text, text, numeric) to authenticated;

-- El equipo de Camina aprueba y se envía: solo entre 8:00 y 21:00 (La Paz), a quien tenga los avisos
-- activados, haya abierto la app en los últimos 14 días y no haya recibido otro aviso cercano en 7 días.
create or replace function approve_nearby_campaign(p_campaign_id uuid) returns integer as $$
declare
  c nearby_campaigns;
  b businesses;
  v_hour integer := extract(hour from (now() at time zone 'America/La_Paz'))::integer;
  v_count integer;
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede aprobar avisos.';
  end if;
  if v_hour < 8 or v_hour >= 21 then
    raise exception 'Los avisos solo se envían entre las 8:00 y las 21:00.';
  end if;
  select * into c from nearby_campaigns where id = p_campaign_id and status = 'pending' for update;
  if c.id is null then
    raise exception 'Aviso no encontrado o ya resuelto.';
  end if;
  select * into b from businesses where id = c.business_id;

  with targets as (
    select l.user_id
    from user_locations l
    join profiles p on p.id = l.user_id and p.nearby_alerts
    where l.updated_at > now() - interval '14 days'
      and 6371 * 2 * asin(sqrt(
            power(sin(radians(l.lat_r - b.lat) / 2), 2)
            + cos(radians(b.lat)) * cos(radians(l.lat_r)) * power(sin(radians(l.lng_r - b.lng) / 2), 2)
          )) <= c.radius_km
      and not exists (
        select 1 from notifications_outbox o
        where o.user_id = l.user_id
          and o.data ->> 'type' = 'nearby'
          and o.created_at > now() - interval '7 days'
      )
    limit 500
  ), ins as (
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    select t.user_id, c.title, c.body,
           jsonb_build_object('type', 'nearby', 'business_id', c.business_id),
           'nearby:' || c.id || ':' || t.user_id
    from targets t
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into v_count from ins;

  update nearby_campaigns set status = 'sent', sent_count = v_count, decided_at = now() where id = c.id;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function approve_nearby_campaign(uuid) to authenticated;

create or replace function reject_nearby_campaign(p_campaign_id uuid) returns void as $$
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede rechazar avisos.';
  end if;
  update nearby_campaigns set status = 'rejected', decided_at = now()
  where id = p_campaign_id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function reject_nearby_campaign(uuid) to authenticated;

-- El admin ve todos los pedidos pendientes con el nombre del comercio.
create or replace function pending_nearby_campaigns()
returns table (id uuid, business_name text, title text, body text, radius_km numeric, created_at timestamptz, estimated integer) as $$
  select c.id, b.name, c.title, c.body, c.radius_km, c.created_at,
    (select count(*)::int from user_locations l
      join profiles p on p.id = l.user_id and p.nearby_alerts
      where l.updated_at > now() - interval '14 days'
        and 6371 * 2 * asin(sqrt(
              power(sin(radians(l.lat_r - b.lat) / 2), 2)
              + cos(radians(b.lat)) * cos(radians(l.lat_r)) * power(sin(radians(l.lng_r - b.lng) / 2), 2)
            )) <= c.radius_km)
  from nearby_campaigns c join businesses b on b.id = c.business_id
  where c.status = 'pending' and is_admin()
  order by c.created_at;
$$ language sql stable security definer set search_path = public;
grant execute on function pending_nearby_campaigns() to authenticated;
