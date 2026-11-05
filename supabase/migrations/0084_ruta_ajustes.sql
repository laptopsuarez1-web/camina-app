-- Ruta del mes, ajustes:
-- 1) Quien completó la ruta del mes pasado tiene 2 cambios de local este mes (en vez de 1).
-- 2) No entran a la ruta los locales donde no se compra al paso: gimnasios, canchas, tiendas online y
--    rubros caros o con turno (óptica, joyería, tecnología, lavandería). Cancheritos F.C queda fuera.

create or replace function route_excluded_category(p_category text) returns boolean as $f$
  select coalesce(lower(p_category), '') in (
    'gimnasio & deporte', 'yoga & pilates', 'fitness', 'deporte', 'deportes', 'gimnasio',
    'tienda online', 'óptica', 'joyería & relojería', 'tecnología', 'lavandería'
  );
$f$ language sql immutable set search_path = public;

create or replace function route_eligible(p_business uuid) returns boolean as $f$
  select exists (
    select 1 from businesses b
    join business_local_codes c on c.business_id = b.id
    where b.id = p_business and b.approved and not b.is_virtual and not b.route_opt_out
      and not route_excluded_category(b.category)
      and b.lat is not null and b.lng is not null
  );
$f$ language sql stable security definer set search_path = public;

update businesses set route_opt_out = true where name ilike 'cancherit%';

create or replace function route_swaps_allowed(p_user uuid, p_month date) returns integer as $f$
  select 1 + case when exists (
    select 1 from route_participants
    where user_id = p_user and month = (p_month - interval '1 month')::date and completed_at is not null
  ) then 1 else 0 end;
$f$ language sql stable security definer set search_path = public;

create or replace function route_state() returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_p route_participants%rowtype;
  v_prev route_participants%rowtype;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  select * into v_p from route_participants where user_id = v_user and month = v_month;
  -- La ruta del mes anterior importa para elegir el Día doble de este mes.
  select * into v_prev from route_participants
    where user_id = v_user and month = (v_month - interval '1 month')::date and completed_at is not null;
  return jsonb_build_object(
    'month', v_month,
    'ends_on', (v_month + interval '1 month' - interval '1 day')::date,
    'joined', v_p.user_id is not null,
    'swaps_left', greatest(0, route_swaps_allowed(v_user, v_month) - coalesce(v_p.swaps_used, 0)),
    'swaps_total', route_swaps_allowed(v_user, v_month),
    'completed_at', v_p.completed_at,
    'ticket_no', v_p.ticket_no,
    'prev_completed', v_prev.user_id is not null,
    'double_day', v_prev.double_day,
    'eligible_count', (select count(*) from businesses b where route_eligible(b.id)),
    -- Los locales que participan (para el fondo de la tarjeta: no dice cuáles te tocaron).
    'locales', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'logo_url', x.logo_url, 'lat', x.lat, 'lng', x.lng))
                         from (select b.name, b.logo_url, b.lat, b.lng from businesses b where route_eligible(b.id) order by b.name limit 12) x), '[]'::jsonb),
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'business_id', b.id, 'name', b.name, 'category', b.category, 'logo_url', b.logo_url,
        'lat', b.lat, 'lng', b.lng, 'address', b.address,
        'visit', (select v.status from route_visits v
                   where v.user_id = v_user and v.month = v_month and v.business_id = b.id and v.status <> 'rejected')
      ) order by s.added_at, b.name)
      from route_stops s join businesses b on b.id = s.business_id
      where s.user_id = v_user and s.month = v_month), '[]'::jsonb)
  );
end;
$f$ language plpgsql stable security definer set search_path = public;


create or replace function route_swap(p_out uuid, p_in uuid) returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_p route_participants%rowtype;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  select * into v_p from route_participants where user_id = v_user and month = v_month for update;
  if not found then raise exception 'Primero toca Participar.'; end if;
  if v_p.swaps_used >= route_swaps_allowed(v_user, v_month) then raise exception 'Ya usaste tus cambios de este mes.'; end if;
  if not exists (select 1 from route_stops where user_id = v_user and month = v_month and business_id = p_out) then
    raise exception 'Ese local no está en tu ruta.';
  end if;
  if exists (select 1 from route_visits where user_id = v_user and month = v_month and business_id = p_out and status <> 'rejected') then
    raise exception 'Ya visitaste ese local: no se puede cambiar.';
  end if;
  if not route_eligible(p_in)
     or exists (select 1 from route_stops where user_id = v_user and month = v_month and business_id = p_in) then
    raise exception 'Ese local no se puede elegir.';
  end if;
  delete from route_stops where user_id = v_user and month = v_month and business_id = p_out;
  insert into route_stops (user_id, month, business_id) values (v_user, v_month, p_in);
  update route_participants set swaps_used = swaps_used + 1 where user_id = v_user and month = v_month;
  return route_state();
end;
$f$ language plpgsql security definer set search_path = public;

revoke execute on function route_excluded_category(text), route_swaps_allowed(uuid, date) from public, anon, authenticated;
