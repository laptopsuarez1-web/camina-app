-- Premio del sorteo de la Ruta del mes.
--
-- Cada mes el admin carga el premio (título, detalle, foto y, si un local lo regala, cuál). La app y la web lo
-- muestran en la Ruta y en Eventos. Al terminar el mes el admin toca "Sortear": se eligen al azar entre los boletos
-- (cada persona que completó la ruta tiene 1) y se les avisa. Nadie gana dos veces en el mismo sorteo.

create table if not exists route_prizes (
  month date primary key check (extract(day from month) = 1),
  title text not null check (length(trim(title)) between 3 and 80),
  detail text check (detail is null or length(detail) <= 300),
  image_url text,
  sponsor_business_id uuid references businesses (id) on delete set null,
  winners_count integer not null default 1 check (winners_count between 1 and 10),
  winners jsonb not null default '[]'::jsonb,
  drawn_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table route_prizes enable row level security;
drop policy if exists "route_prizes: admin" on route_prizes;
create policy "route_prizes: admin" on route_prizes for all to authenticated using (is_admin()) with check (is_admin());
grant select, insert, update, delete on route_prizes to authenticated;
-- Lectura pública con route_prize() (no expone ids de las personas ganadoras).

-- Premio del mes (por defecto el actual), para la app y la web. Ganadores con nombre y la inicial del apellido.
create or replace function route_prize(p_month date default null) returns jsonb as $f$
  select case when p.month is null then null else jsonb_build_object(
    'month', p.month,
    'title', p.title,
    'detail', p.detail,
    'image_url', p.image_url,
    'sponsor', case when b.id is null then null else jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url) end,
    'winners_count', p.winners_count,
    'drawn_at', p.drawn_at,
    'winners', coalesce((select jsonb_agg(jsonb_build_object('name', w->>'name', 'ticket_no', (w->>'ticket_no')::int)) from jsonb_array_elements(p.winners) w), '[]'::jsonb),
    'tickets', (select count(*) from route_participants rp where rp.month = p.month and rp.ticket_no is not null)
  ) end
  from (select coalesce(p_month, route_month()) as m) q
  left join route_prizes p on p.month = q.m
  left join businesses b on b.id = p.sponsor_business_id;
$f$ language sql stable security definer set search_path = public;

-- "Daniela Ríos" → "Daniela R."
create or replace function short_name(p_full text) returns text as $f$
  select case
    when coalesce(trim(p_full), '') = '' then 'Caminante'
    when position(' ' in trim(p_full)) = 0 then trim(p_full)
    else split_part(trim(p_full), ' ', 1) || ' ' || upper(left(split_part(trim(p_full), ' ', 2), 1)) || '.'
  end;
$f$ language sql immutable;

-- Sorteo: solo admin, solo meses terminados y una sola vez.
create or replace function route_draw(p_month date) returns jsonb as $f$
declare
  p route_prizes;
  v_winners jsonb;
  r record;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  select * into p from route_prizes where month = p_month for update;
  if not found then raise exception 'Ese mes no tiene premio cargado'; end if;
  if p.drawn_at is not null then raise exception 'Ese sorteo ya se hizo'; end if;
  if p_month >= route_month() then raise exception 'El sorteo se hace cuando termina el mes'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', x.user_id, 'name', short_name(x.full_name), 'ticket_no', x.ticket_no)), '[]'::jsonb)
    into v_winners
  from (
    select rp.user_id, pr.full_name, rp.ticket_no
    from route_participants rp join profiles pr on pr.id = rp.user_id
    where rp.month = p_month and rp.ticket_no is not null
    order by random()
    limit p.winners_count
  ) x;

  update route_prizes set winners = v_winners, drawn_at = now(), updated_at = now() where month = p_month;

  for r in select (w->>'user_id')::uuid as uid from jsonb_array_elements(v_winners) w loop
    perform queue_notification(r.uid, '¡Ganaste el sorteo de la Ruta!',
      'Tu boleto salió sorteado: ganaste ' || p.title || '. Te escribimos para coordinar la entrega.',
      jsonb_build_object('screen', 'ruta'), 'route_prize:' || r.uid || ':' || p_month);
  end loop;

  return route_prize(p_month);
end;
$f$ language plpgsql security definer set search_path = public;

revoke execute on function route_prize(date), route_draw(date), short_name(text) from public;
grant execute on function route_prize(date) to anon, authenticated;
grant execute on function route_draw(date) to authenticated;
grant execute on function short_name(text) to authenticated;

-- Foto del premio: bucket público; solo el admin sube.
insert into storage.buckets (id, name, public) values ('route-prizes', 'route-prizes', true) on conflict (id) do nothing;
drop policy if exists "route-prizes: public read" on storage.objects;
create policy "route-prizes: public read" on storage.objects for select using (bucket_id = 'route-prizes');
drop policy if exists "route-prizes: admin write" on storage.objects;
create policy "route-prizes: admin write" on storage.objects for insert to authenticated with check (bucket_id = 'route-prizes' and is_admin());
drop policy if exists "route-prizes: admin update" on storage.objects;
create policy "route-prizes: admin update" on storage.objects for update to authenticated using (bucket_id = 'route-prizes' and is_admin());
