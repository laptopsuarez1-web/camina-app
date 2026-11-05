-- Insignias de locales (Visitante, Habitual, Fan), beneficio solo para Fans, fotos de la Ruta y banner del perfil con foto.
--
-- Puntos de nivel en cada local (no son Puntos de Camina; solo suben tu insignia en ese local):
--   * Canje confirmado: +2.   * Visita de la Ruta confirmada: +2.
--   * Calificar el local después del canje (botón "Dejar reseña"): +1, una vez por canje.
--   * Historia aprobada de ese canje: +1.
-- Niveles: Visitante desde el primer punto, Habitual con 10, Fan con 20. Son para siempre y las ve todo el mundo.

-- ---------- 1) Puntos de nivel ----------
create table if not exists business_level_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  source text not null check (source in ('canje', 'visita', 'resena', 'historia')),
  ref uuid not null,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (source, ref)
);
create index if not exists blp_user_business on business_level_points (user_id, business_id);
create index if not exists blp_business on business_level_points (business_id);
alter table business_level_points enable row level security;
drop policy if exists "blp: own" on business_level_points;
create policy "blp: own" on business_level_points for select to authenticated using (user_id = auth.uid());

create or replace function level_name(p_points integer) returns text as $f$
  select case when p_points >= 20 then 'fan' when p_points >= 10 then 'habitual' when p_points > 0 then 'visitante' else null end;
$f$ language sql immutable set search_path = public;

create or replace function user_level_points(p_user uuid, p_business uuid) returns integer as $f$
  select coalesce(sum(points), 0)::integer from business_level_points where user_id = p_user and business_id = p_business;
$f$ language sql stable security definer set search_path = public;

-- Al subir a Fan se avisa (una sola vez por local).
create or replace function _level_points_after_insert() returns trigger as $f$
declare
  v_after integer;
  v_before integer;
  v_name text;
begin
  v_after := user_level_points(new.user_id, new.business_id);
  v_before := v_after - new.points;
  if v_before < 20 and v_after >= 20 then
    select name into v_name from businesses where id = new.business_id;
    perform queue_notification(new.user_id, '¡Ahora eres Fan de ' || v_name || '!',
      'Tu insignia de Fan ya se ve en tu perfil.', jsonb_build_object('screen', 'insignias', 'business_id', new.business_id),
      'fan:' || new.user_id || ':' || new.business_id);
  end if;
  return null;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists level_points_after_insert on business_level_points;
create trigger level_points_after_insert after insert on business_level_points
  for each row execute function _level_points_after_insert();

-- Canje confirmado: +2.
create or replace function _level_from_redemption() returns trigger as $f$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    insert into business_level_points (user_id, business_id, source, ref, points)
    values (new.user_id, new.business_id, 'canje', new.id, 2) on conflict (source, ref) do nothing;
  end if;
  return null;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists level_from_redemption on redemptions;
create trigger level_from_redemption after insert or update of status on redemptions
  for each row execute function _level_from_redemption();

-- Visita de la Ruta confirmada: +2.
create or replace function _level_from_route_visit() returns trigger as $f$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into business_level_points (user_id, business_id, source, ref, points)
    values (new.user_id, new.business_id, 'visita', new.id, 2) on conflict (source, ref) do nothing;
  end if;
  return null;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists level_from_route_visit on route_visits;
create trigger level_from_route_visit after update of status on route_visits
  for each row execute function _level_from_route_visit();

-- Historia aprobada: +1.
create or replace function _level_from_story() returns trigger as $f$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into business_level_points (user_id, business_id, source, ref, points)
    values (new.user_id, new.business_id, 'historia', new.redemption_id, 1) on conflict (source, ref) do nothing;
  end if;
  return null;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists level_from_story on story_shares;
create trigger level_from_story after update of status on story_shares
  for each row execute function _level_from_story();

-- Calificar el local después de un canje confirmado (el botón "Dejar reseña"): +1, una vez por canje.
create or replace function level_review(p_redemption uuid) returns integer as $f$
declare
  r redemptions;
begin
  select * into r from redemptions where id = p_redemption and user_id = auth.uid();
  if not found or r.status <> 'confirmed' then return 0; end if;
  insert into business_level_points (user_id, business_id, source, ref, points)
  values (r.user_id, r.business_id, 'resena', r.id, 1) on conflict (source, ref) do nothing;
  return user_level_points(r.user_id, r.business_id);
end;
$f$ language plpgsql security definer set search_path = public;

-- Lo que ya canjeó cada persona cuenta desde hoy (sus canjes confirmados anteriores dan sus +2).
insert into business_level_points (user_id, business_id, source, ref, points, created_at)
select user_id, business_id, 'canje', id, 2, coalesce(confirmed_at, created_at) from redemptions where status = 'confirmed'
on conflict (source, ref) do nothing;

-- ---------- 2) Insignias públicas y destacada ----------
alter table profiles add column if not exists featured_badge text;
alter table profiles add column if not exists profile_banner_url text;  -- 'ruta:<YYYY-MM-01>' o 'local:<business_id>'

create or replace function user_badges(p_user uuid) returns jsonb as $f$
  select jsonb_build_object(
    'featured', (select featured_badge from profiles where id = p_user),
    'banner_url', (select case when profile_bg = 'foto' then profile_banner_url end from profiles where id = p_user),
    'routes', coalesce((select jsonb_agg(jsonb_build_object('month', month, 'completed_at', completed_at) order by month desc)
                        from route_participants where user_id = p_user and completed_at is not null), '[]'::jsonb),
    'locals', coalesce((select jsonb_agg(x order by x->>'points' desc) from (
        select jsonb_build_object('business_id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
          'points', sum(l.points)::int, 'level', level_name(sum(l.points)::int)) x
        from business_level_points l join businesses b on b.id = l.business_id
        where l.user_id = p_user group by b.id) t), '[]'::jsonb)
  );
$f$ language sql stable security definer set search_path = public;

create or replace function set_featured_badge(p_badge text) returns void as $f$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_badge is not null and p_badge !~ '^(ruta:[0-9]{4}-[0-9]{2}-01|local:[0-9a-f-]{36})$' then
    raise exception 'Insignia inválida';
  end if;
  update profiles set featured_badge = p_badge where id = auth.uid();
end;
$f$ language plpgsql security definer set search_path = public;

-- Mi nivel en un local (para la ficha del local).
create or replace function my_level(p_business uuid) returns jsonb as $f$
  select jsonb_build_object('points', user_level_points(auth.uid(), p_business),
    'level', level_name(user_level_points(auth.uid(), p_business)));
$f$ language sql stable security definer set search_path = public;

-- ---------- 3) Beneficio solo para Fans (opcional, lo elige el local) ----------
alter table benefits add column if not exists fans_only boolean not null default false;

create or replace function _fans_only_guard() returns trigger as $f$
declare
  v_fans boolean;
begin
  select fans_only into v_fans from benefits where id = new.benefit_id;
  if coalesce(v_fans, false) and user_level_points(new.user_id, new.business_id) < 20 then
    raise exception 'Este premio es solo para los Fans del local.';
  end if;
  return new;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists fans_only_guard on redemptions;
create trigger fans_only_guard before insert on redemptions for each row execute function _fans_only_guard();

-- Panel: Visitantes, Habituales y Fans del local, y sus mejores Fans.
create or replace function business_fans(p_business uuid) returns jsonb as $f$
begin
  if not is_business_member(p_business) then raise exception 'No autorizado'; end if;
  return (with t as (
      select user_id, sum(points)::int pts from business_level_points where business_id = p_business group by user_id)
    select jsonb_build_object(
      'visitantes', count(*) filter (where pts > 0 and pts < 10),
      'habituales', count(*) filter (where pts >= 10 and pts < 20),
      'fans', count(*) filter (where pts >= 20),
      'top', coalesce((select jsonb_agg(jsonb_build_object('name', split_part(coalesce(nullif(btrim(p.full_name), ''), 'Cliente'), ' ', 1), 'points', t2.pts) order by t2.pts desc)
              from (select * from t where pts >= 20 order by pts desc limit 10) t2 join profiles p on p.id = t2.user_id), '[]'::jsonb),
      'reviews_month', (select count(*) from business_level_points where business_id = p_business and source = 'resena' and created_at >= date_trunc('month', now())),
      'stories_month', (select count(*) from business_level_points where business_id = p_business and source = 'historia' and created_at >= date_trunc('month', now())))
    from t);
end;
$f$ language plpgsql stable security definer set search_path = public;

-- ---------- 4) Fotos de la Ruta (una por local visitado) ----------
create table if not exists route_photos (
  user_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  business_id uuid not null references businesses (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, month, business_id)
);
alter table route_photos enable row level security;
drop policy if exists "route_photos: own" on route_photos;
create policy "route_photos: own" on route_photos for select to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('route-photos', 'route-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "route-photos: owner write" on storage.objects;
create policy "route-photos: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'route-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "route-photos: owner update" on storage.objects;
create policy "route-photos: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'route-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "route-photos: owner read" on storage.objects;
create policy "route-photos: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'route-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function set_route_photo(p_month date, p_business uuid, p_path text) returns void as $f$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text or p_path like '%..%' then
    raise exception 'No encontramos la foto. Vuelve a elegirla.';
  end if;
  if not exists (select 1 from route_visits where user_id = auth.uid() and month = p_month and business_id = p_business and status <> 'rejected') then
    raise exception 'Primero marca tu visita en ese local.';
  end if;
  insert into route_photos (user_id, month, business_id, path) values (auth.uid(), p_month, p_business, p_path)
  on conflict (user_id, month, business_id) do update set path = excluded.path, created_at = now();
end;
$f$ language plpgsql security definer set search_path = public;

-- Una ruta mía (de cualquier mes) con sus locales, fechas y fotos: para el detalle de la insignia.
create or replace function my_route(p_month date) returns jsonb as $f$
  select jsonb_build_object(
    'month', p.month, 'completed_at', p.completed_at, 'ticket_no', p.ticket_no,
    'stops', coalesce((select jsonb_agg(jsonb_build_object(
        'business_id', b.id, 'name', b.name, 'category', b.category, 'logo_url', b.logo_url, 'lat', b.lat, 'lng', b.lng,
        'visited_at', (select v.decided_at from route_visits v where v.user_id = p.user_id and v.month = p.month and v.business_id = b.id and v.status = 'confirmed'),
        'photo_path', (select ph.path from route_photos ph where ph.user_id = p.user_id and ph.month = p.month and ph.business_id = b.id)
      ) order by s.added_at) from route_stops s join businesses b on b.id = s.business_id
      where s.user_id = p.user_id and s.month = p.month), '[]'::jsonb))
  from route_participants p where p.user_id = auth.uid() and p.month = p_month;
$f$ language sql stable security definer set search_path = public;

-- ---------- 5) Banner del perfil con foto ----------
alter table profiles add column if not exists profile_banner_url text;
-- 'foto' = la foto propia de profile_banner_url (las demás claves son las ilustraciones de 0079).
alter table profiles drop constraint if exists profiles_bg_key;
alter table profiles add constraint profiles_bg_key check (profile_bg is null or profile_bg in ('violeta','bosque','ciudad','sendero','pista','cielo','foto'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-banners', 'profile-banners', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "profile-banners: public read" on storage.objects;
create policy "profile-banners: public read" on storage.objects for select using (bucket_id = 'profile-banners');
drop policy if exists "profile-banners: owner write" on storage.objects;
create policy "profile-banners: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profile-banners: owner update" on storage.objects;
create policy "profile-banners: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profile-banners: owner delete" on storage.objects;
create policy "profile-banners: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-banners' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 6) Permisos ----------
revoke execute on function level_review(uuid), user_badges(uuid), set_featured_badge(text), my_level(uuid), business_fans(uuid),
  set_route_photo(date, uuid, text), my_route(date) from public, anon;
grant execute on function level_review(uuid), user_badges(uuid), set_featured_badge(text), my_level(uuid), business_fans(uuid),
  set_route_photo(date, uuid, text), my_route(date) to authenticated;
revoke execute on function level_name(integer), user_level_points(uuid, uuid), _level_points_after_insert(), _level_from_redemption(),
  _level_from_route_visit(), _level_from_story(), _fans_only_guard() from public, anon, authenticated;
