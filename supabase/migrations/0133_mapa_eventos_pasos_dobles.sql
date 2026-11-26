-- 0133: Mapa con eventos y lugares de "Pasos dobles" (x2).
--
-- 1) Eventos en el mapa: el comercio puede marcar el punto del evento (place_lat/place_lng).
--    Si no lo marca, la app pone el pin donde está su local.
-- 2) Lugares x2 (shoppings, malls...): los crea el equipo de Camina desde el admin.
--    Dentro de la zona y entre las fechas, cada 1.000 pasos dan 1 Punto extra, con un tope por persona y lugar.
--    Los Puntos extra van APARTE del tope diario de pasos.
--    Sin permiso de ubicación "siempre": la persona toca Empezar (estando adentro); cada vez que abre la app
--    (o toca Terminar) se mira la ubicación y se suman los pasos hechos entre Empezar y la última vez que estuvo adentro.
--    Los pasos se validan contra el tiempo transcurrido (máximo 200 por minuto) y contra el tope de la sesión.

-- ---------- 1) Punto del evento ----------
alter table promotions add column if not exists place_lat double precision check (place_lat is null or place_lat between -90 and 90);
alter table promotions add column if not exists place_lng double precision check (place_lng is null or place_lng between -180 and 180);

create or replace function set_promotion_point(p_id uuid, p_lat double precision, p_lng double precision) returns void as $$
begin
  if not exists (
    select 1 from promotions p join businesses b on b.id = p.business_id
    where p.id = p_id and (b.owner_user_id = auth.uid() or is_admin())
  ) then
    raise exception 'No autorizado';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Falta la otra coordenada.';
  end if;
  update promotions set place_lat = p_lat, place_lng = p_lng where id = p_id;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function set_promotion_point(uuid, double precision, double precision) from public, anon;
grant execute on function set_promotion_point(uuid, double precision, double precision) to authenticated;

-- ---------- 2) Lugares x2 ----------
create table if not exists boost_places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  address text check (address is null or char_length(address) <= 160),
  logo_url text check (logo_url is null or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  cover_url text check (cover_url is null or (cover_url ~ '^https://' and char_length(cover_url) <= 500)),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  radius_m integer not null default 150 check (radius_m between 30 and 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_points integer not null default 20 check (max_points between 1 and 200),
  steps_per_point integer not null default 1000 check (steps_per_point between 100 and 10000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table boost_places enable row level security;
drop policy if exists "boost_places: read" on boost_places;
create policy "boost_places: read" on boost_places for select to authenticated using (active or is_admin());
drop policy if exists "boost_places: admin write" on boost_places;
create policy "boost_places: admin write" on boost_places for all to authenticated using (is_admin()) with check (is_admin());
revoke all on boost_places from anon;
grant select, insert, update, delete on boost_places to authenticated;

create table if not exists boost_sessions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references boost_places (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_inside_at timestamptz not null default now(),
  ended_at timestamptz,
  steps integer not null default 0,
  points integer not null default 0
);
create unique index if not exists boost_sessions_one_open on boost_sessions (user_id) where ended_at is null;
create index if not exists boost_sessions_user_place on boost_sessions (user_id, place_id);
alter table boost_sessions enable row level security;
drop policy if exists "boost_sessions: own" on boost_sessions;
create policy "boost_sessions: own" on boost_sessions for select to authenticated using (user_id = auth.uid() or is_admin());
-- Solo lectura desde el cliente: las sesiones las escriben boost_start / boost_update.
revoke all on boost_sessions from anon, authenticated;
grant select on boost_sessions to authenticated;

-- Reglas (fáciles de cambiar): tolerancia del GPS, pasos por minuto creíbles y duración máxima de una sesión.
create or replace function boost_gps_slack_m() returns integer as $f$ select 40 $f$ language sql immutable;
create or replace function boost_max_steps_per_minute() returns integer as $f$ select 200 $f$ language sql immutable;
create or replace function boost_max_session() returns interval as $f$ select interval '6 hours' $f$ language sql immutable;
revoke execute on function boost_gps_slack_m(), boost_max_steps_per_minute(), boost_max_session() from public, anon, authenticated;

-- Puntos extra que la persona ya ganó en un lugar (todas sus sesiones).
create or replace function boost_points_at(p_user uuid, p_place uuid) returns integer as $f$
  select coalesce(sum(points), 0)::integer from boost_sessions where user_id = p_user and place_id = p_place;
$f$ language sql stable security definer set search_path = public;
revoke execute on function boost_points_at(uuid, uuid) from public, anon, authenticated;

-- Lugares vigentes (o que empiezan pronto) con lo que la persona ya ganó en cada uno.
create or replace function boost_places_for_me() returns table (
  id uuid, name text, address text, logo_url text, cover_url text, lat double precision, lng double precision,
  radius_m integer, starts_at timestamptz, ends_at timestamptz, max_points integer, steps_per_point integer, my_points integer
) as $$
  select p.id, p.name, p.address, p.logo_url, p.cover_url, p.lat, p.lng, p.radius_m, p.starts_at, p.ends_at,
         p.max_points, p.steps_per_point, boost_points_at(auth.uid(), p.id)
  from boost_places p
  where p.active and p.ends_at > now() and p.starts_at < now() + interval '14 days'
  order by p.starts_at;
$$ language sql stable security definer set search_path = public;
revoke execute on function boost_places_for_me() from public, anon;
grant execute on function boost_places_for_me() to authenticated;

create or replace function boost_session_json(s boost_sessions) returns jsonb as $f$
  select jsonb_build_object(
    'id', s.id, 'place_id', s.place_id, 'started_at', s.started_at, 'last_inside_at', s.last_inside_at,
    'ended_at', s.ended_at, 'steps', s.steps, 'points', s.points,
    'place_points', boost_points_at(s.user_id, s.place_id));
$f$ language sql stable security definer set search_path = public;
revoke execute on function boost_session_json(boost_sessions) from public, anon, authenticated;

-- Empezar: hay que estar dentro de la zona y dentro de las fechas. Cierra cualquier otra sesión abierta.
create or replace function boost_start(p_place uuid, p_lat double precision, p_lng double precision) returns jsonb as $$
declare
  v_user uuid := auth.uid();
  pl boost_places;
  s boost_sessions;
  v_dist integer;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  select * into pl from boost_places where id = p_place and active;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_existe'); end if;
  if now() < pl.starts_at then return jsonb_build_object('ok', false, 'reason', 'no_empezo'); end if;
  if now() >= pl.ends_at then return jsonb_build_object('ok', false, 'reason', 'termino'); end if;
  if p_lat is null or p_lng is null then return jsonb_build_object('ok', false, 'reason', 'sin_ubicacion'); end if;
  v_dist := distance_m(pl.lat, pl.lng, p_lat, p_lng);
  if v_dist > pl.radius_m + boost_gps_slack_m() then
    return jsonb_build_object('ok', false, 'reason', 'lejos', 'distance_m', v_dist);
  end if;
  if not device_allows_steps(v_user) then return jsonb_build_object('ok', false, 'reason', 'celular'); end if;
  if boost_points_at(v_user, p_place) >= pl.max_points then return jsonb_build_object('ok', false, 'reason', 'tope'); end if;

  -- Una sola sesión abierta por persona: si había otra (de este u otro lugar), se cierra sin sumar nada nuevo.
  update boost_sessions set ended_at = now() where user_id = v_user and ended_at is null;
  insert into boost_sessions (place_id, user_id) values (p_place, v_user) returning * into s;
  return jsonb_build_object('ok', true, 'session', boost_session_json(s));
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function boost_start(uuid, double precision, double precision) from public, anon;
grant execute on function boost_start(uuid, double precision, double precision) to authenticated;

-- Actualizar / terminar. p_steps = pasos desde Empezar hasta ahora (si está adentro) o hasta la última vez que estuvo adentro.
-- Si ya no está adentro (o p_end), la sesión se cierra. Lo ganado se queda.
create or replace function boost_update(p_session uuid, p_lat double precision, p_lng double precision, p_steps integer, p_end boolean default false)
returns jsonb as $$
declare
  v_user uuid := auth.uid();
  s boost_sessions;
  pl boost_places;
  v_inside boolean;
  v_now timestamptz := now();
  v_limit_at timestamptz;
  v_allowed integer;
  v_steps integer;
  v_other integer;
  v_target integer;
  v_delta integer;
begin
  select * into s from boost_sessions where id = p_session and user_id = v_user for update;
  if not found then raise exception 'No autorizado'; end if;
  if s.ended_at is not null then
    return jsonb_build_object('ok', true, 'inside', false, 'session', boost_session_json(s));
  end if;
  select * into pl from boost_places where id = s.place_id;

  -- Hasta dónde vale: fin del lugar o tope de duración de la sesión.
  v_limit_at := least(pl.ends_at, s.started_at + boost_max_session());
  v_inside := pl.active and v_now < v_limit_at and p_lat is not null and p_lng is not null
              and distance_m(pl.lat, pl.lng, p_lat, p_lng) <= pl.radius_m + boost_gps_slack_m();
  if v_inside then
    s.last_inside_at := v_now;
  end if;

  -- Pasos creíbles para el tiempo que estuvo adentro (desde Empezar hasta la última vez adentro).
  v_allowed := floor(greatest(extract(epoch from (least(s.last_inside_at, v_limit_at) - s.started_at)), 0) / 60.0 * boost_max_steps_per_minute())::integer;
  v_steps := greatest(s.steps, least(greatest(coalesce(p_steps, 0), 0), v_allowed, 60000));

  v_other := boost_points_at(v_user, pl.id) - s.points;
  v_target := least(floor(v_steps / pl.steps_per_point::numeric)::integer, greatest(pl.max_points - v_other, 0));
  v_delta := v_target - s.points;
  if v_delta > 0 then
    insert into points_ledger (user_id, amount, reason, ref_day, note, expires_at)
    values (v_user, v_delta, 'challenge', local_today(), 'Pasos dobles: ' || pl.name, now() + (points_ttl_days() || ' days')::interval);
  else
    v_target := s.points;
  end if;

  update boost_sessions set
    last_inside_at = s.last_inside_at,
    steps = v_steps,
    points = v_target,
    ended_at = case when (not v_inside) or p_end or v_now >= v_limit_at then v_now end
  where id = s.id
  returning * into s;

  return jsonb_build_object('ok', true, 'inside', v_inside, 'session', boost_session_json(s));
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function boost_update(uuid, double precision, double precision, integer, boolean) from public, anon;
grant execute on function boost_update(uuid, double precision, double precision, integer, boolean) to authenticated;

-- Para el admin: cuánta gente usó cada lugar y cuántos Puntos extra se dieron.
create or replace function admin_boost_stats() returns table (place_id uuid, people integer, points integer) as $$
begin
  if not is_admin() then raise exception 'Solo el equipo de Camina puede hacer esto.'; end if;
  return query select bs.place_id, count(distinct bs.user_id)::integer, coalesce(sum(bs.points), 0)::integer
    from boost_sessions bs group by bs.place_id;
end;
$$ language plpgsql stable security definer set search_path = public;
revoke execute on function admin_boost_stats() from public, anon;
grant execute on function admin_boost_stats() to authenticated;
