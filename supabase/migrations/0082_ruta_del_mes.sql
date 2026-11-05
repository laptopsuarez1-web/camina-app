-- Ruta del mes (evento mensual en Eventos).
--
-- Cada mes la persona toca "Participar" y le tocan 3 locales al azar entre los que participan.
-- Los visita en el orden que quiera y compra lo que quiera: NO usa Puntos ni descuentos.
-- Al pagar escribe el código del local (el mismo de 0065) estando cerca; el local confirma desde su panel
-- si compró ("Compró" / "No compró"). Con los 3 confirmados completa la ruta y gana:
--   * Día doble: elige un día del mes siguiente y ese día sus pasos valen el doble (tope 40 Puntos, no 20).
--   * La insignia de ese mes (route_participants.completed_at).
--   * Un boleto para el sorteo del mes (route_participants.ticket_no).
-- Puede cambiar 1 local por mes, antes de visitarlo, eligiendo otro de los que participan.
--
-- No toca canjes, Puntos de canje ni el código del local: solo los lee.

-- ---------- 1) Qué locales participan ----------
-- Por defecto participan los locales aprobados, físicos, con ubicación y código del local.
-- Un local puede salirse con route_opt_out.
alter table businesses add column if not exists route_opt_out boolean not null default false;

create or replace function route_month() returns date as $f$
  select date_trunc('month', local_today())::date;
$f$ language sql stable set search_path = public;

create or replace function route_eligible(p_business uuid) returns boolean as $f$
  select exists (
    select 1 from businesses b
    join business_local_codes c on c.business_id = b.id
    where b.id = p_business and b.approved and not b.is_virtual and not b.route_opt_out
      and b.lat is not null and b.lng is not null
  );
$f$ language sql stable security definer set search_path = public;

-- ---------- 2) Tablas ----------
create sequence if not exists route_ticket_seq;

create table if not exists route_participants (
  user_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  joined_at timestamptz not null default now(),
  swaps_used integer not null default 0,
  completed_at timestamptz,
  ticket_no integer,
  double_day date,
  primary key (user_id, month)
);

create table if not exists route_stops (
  user_id uuid not null,
  month date not null,
  business_id uuid not null references businesses (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, month, business_id),
  foreign key (user_id, month) references route_participants (user_id, month) on delete cascade
);

create table if not exists route_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  business_id uuid not null references businesses (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  distance_m integer,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
-- Una sola visita viva (pendiente o confirmada) por persona, mes y local.
create unique index if not exists route_visits_one_alive
  on route_visits (user_id, month, business_id) where status <> 'rejected';
create index if not exists route_visits_business_pending on route_visits (business_id, created_at) where status = 'pending';

alter table route_participants enable row level security;
alter table route_stops enable row level security;
alter table route_visits enable row level security;
-- Lectura propia; todo lo demás pasa por las funciones de abajo.
drop policy if exists "route_participants: own" on route_participants;
create policy "route_participants: own" on route_participants for select to authenticated using (user_id = auth.uid());
drop policy if exists "route_stops: own" on route_stops;
create policy "route_stops: own" on route_stops for select to authenticated using (user_id = auth.uid());
drop policy if exists "route_visits: own" on route_visits;
create policy "route_visits: own" on route_visits for select to authenticated using (user_id = auth.uid());

-- ---------- 3) Estado de mi ruta ----------
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
    'swaps_left', case when v_p.user_id is null then 1 else greatest(0, 1 - v_p.swaps_used) end,
    'completed_at', v_p.completed_at,
    'ticket_no', v_p.ticket_no,
    'prev_completed', v_prev.user_id is not null,
    'double_day', v_prev.double_day,
    'eligible_count', (select count(*) from businesses b where route_eligible(b.id)),
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

-- ---------- 4) Participar: le tocan 3 locales al azar ----------
create or replace function route_join() returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  if exists (select 1 from route_participants where user_id = v_user and month = v_month) then
    return route_state();
  end if;
  if (select count(*) from businesses b where route_eligible(b.id)) < 3 then
    raise exception 'Todavía no hay suficientes locales para la Ruta de este mes.';
  end if;
  insert into route_participants (user_id, month) values (v_user, v_month);
  insert into route_stops (user_id, month, business_id)
  select v_user, v_month, b.id from businesses b where route_eligible(b.id) order by random() limit 3;
  return route_state();
end;
$f$ language plpgsql security definer set search_path = public;

-- Locales que puede elegir al cambiar uno (los que participan y no están en su ruta).
create or replace function route_swap_options() returns jsonb as $f$
  select coalesce(jsonb_agg(jsonb_build_object('business_id', b.id, 'name', b.name, 'category', b.category,
    'logo_url', b.logo_url) order by b.name), '[]'::jsonb)
  from businesses b
  where route_eligible(b.id)
    and not exists (select 1 from route_stops s where s.user_id = auth.uid() and s.month = route_month() and s.business_id = b.id);
$f$ language sql stable security definer set search_path = public;

-- ---------- 5) Cambiar 1 local por mes ----------
create or replace function route_swap(p_out uuid, p_in uuid) returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_p route_participants%rowtype;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  select * into v_p from route_participants where user_id = v_user and month = v_month for update;
  if not found then raise exception 'Primero toca Participar.'; end if;
  if v_p.swaps_used >= 1 then raise exception 'Ya usaste tu cambio de este mes.'; end if;
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

-- ---------- 6) Marcar mi visita con el código del local ----------
create or replace function route_mark_visit(p_business uuid, p_code text, p_lat double precision, p_lng double precision)
returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_biz businesses%rowtype;
  v_code text;
  v_dist integer;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  if not exists (select 1 from route_stops where user_id = v_user and month = v_month and business_id = p_business) then
    return jsonb_build_object('ok', false, 'reason', 'no_en_ruta');
  end if;
  if exists (select 1 from route_visits where user_id = v_user and month = v_month and business_id = p_business and status <> 'rejected') then
    return jsonb_build_object('ok', false, 'reason', 'ya_marcada');
  end if;
  -- Tope de intentos para que no se adivine el código: 5 rechazos o fallos por local y mes.
  if (select count(*) from route_visits where user_id = v_user and month = v_month and business_id = p_business) >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'demasiados_intentos');
  end if;
  select * into v_biz from businesses where id = p_business;
  select code into v_code from business_local_codes where business_id = p_business;
  if v_code is null or v_biz.lat is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_codigo');
  end if;
  if p_lat is null or p_lng is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_ubicacion');
  end if;
  v_dist := distance_m(v_biz.lat, v_biz.lng, p_lat, p_lng);
  if v_dist > local_code_max_distance_m() then
    return jsonb_build_object('ok', false, 'reason', 'lejos', 'distance_m', v_dist);
  end if;
  if p_code is distinct from v_code then
    return jsonb_build_object('ok', false, 'reason', 'codigo_incorrecto');
  end if;
  insert into route_visits (user_id, month, business_id, distance_m) values (v_user, v_month, p_business, v_dist);
  insert into business_notifications (business_id, title, body)
  values (p_business, 'Visita de la Ruta', 'Alguien vino por la Ruta del mes. Confirma en tu panel si compró.');
  return jsonb_build_object('ok', true);
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- 7) Panel del local: ver y confirmar visitas ----------
create or replace function route_business_visits(p_business uuid) returns jsonb as $f$
begin
  if not is_business_member(p_business) then raise exception 'No autorizado'; end if;
  return jsonb_build_object(
    'month_visits', (select count(*) from route_visits where business_id = p_business and month = route_month() and status = 'confirmed'),
    'new_clients', (select count(distinct v.user_id) from route_visits v
                    where v.business_id = p_business and v.month = route_month() and v.status = 'confirmed'
                      and not exists (select 1 from redemptions r where r.user_id = v.user_id and r.business_id = p_business
                                      and r.created_at < v.created_at)),
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'status', v.status, 'created_at', v.created_at,
        'name', split_part(coalesce(nullif(btrim(p.full_name), ''), 'Cliente'), ' ', 1)) order by v.created_at desc)
      from (select * from route_visits where business_id = p_business and status <> 'rejected'
            order by (status = 'pending') desc, created_at desc limit 30) v
      join profiles p on p.id = v.user_id), '[]'::jsonb)
  );
end;
$f$ language plpgsql stable security definer set search_path = public;

create or replace function route_decide_visit(p_visit uuid, p_bought boolean) returns jsonb as $f$
declare
  v route_visits%rowtype;
  v_done integer;
  v_ticket integer;
begin
  select * into v from route_visits where id = p_visit for update;
  if not found or not is_business_member(v.business_id) then raise exception 'No autorizado'; end if;
  if v.status <> 'pending' then raise exception 'Esa visita ya fue revisada.'; end if;
  update route_visits set status = case when p_bought then 'confirmed' else 'rejected' end,
    decided_at = now(), decided_by = auth.uid() where id = p_visit;
  if not p_bought then
    perform queue_notification(v.user_id, 'Visita no confirmada',
      'El local no confirmó una compra. Si compraste, vuelve a marcar tu visita.', jsonb_build_object('screen', 'ruta'), null);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
  select count(*) into v_done from route_visits rv
    join route_stops s on s.user_id = rv.user_id and s.month = rv.month and s.business_id = rv.business_id
    where rv.user_id = v.user_id and rv.month = v.month and rv.status = 'confirmed';
  if v_done >= 3 then
    v_ticket := nextval('route_ticket_seq');
    update route_participants set completed_at = now(), ticket_no = v_ticket
      where user_id = v.user_id and month = v.month and completed_at is null;
    if found then
      perform queue_notification(v.user_id, '¡Completaste tu Ruta del mes!',
        'Ganaste tu insignia, un boleto para el sorteo y tu Día doble. Elige tu día.',
        jsonb_build_object('screen', 'ruta'), 'route_done:' || v.user_id || ':' || v.month);
    end if;
  else
    perform queue_notification(v.user_id, '¡Visita confirmada!',
      'Vas ' || v_done || ' de 3 en tu Ruta del mes.', jsonb_build_object('screen', 'ruta'), 'route_visit:' || v.id);
  end if;
  return jsonb_build_object('ok', true, 'status', 'confirmed', 'done', v_done);
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- 8) Día doble ----------
-- Quien completó la ruta del mes anterior elige un día de este mes (hoy o después).
create or replace function route_pick_double_day(p_day date) returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_month date := route_month();
  v_prev date := (route_month() - interval '1 month')::date;
  v_cur date;
begin
  if v_user is null then raise exception 'No autorizado'; end if;
  select double_day into v_cur from route_participants
    where user_id = v_user and month = v_prev and completed_at is not null for update;
  if not found then raise exception 'Tu Día doble se gana completando la Ruta del mes.'; end if;
  if v_cur is not null and v_cur <= local_today() then raise exception 'Tu Día doble ya pasó o es hoy.'; end if;
  if p_day < local_today() or date_trunc('month', p_day)::date <> v_month then
    raise exception 'Elige un día de este mes, desde hoy.';
  end if;
  update route_participants set double_day = p_day where user_id = v_user and month = v_prev;
  return route_state();
end;
$f$ language plpgsql security definer set search_path = public;

create or replace function is_double_day(p_user uuid, p_day date) returns boolean as $f$
  select exists (select 1 from route_participants where user_id = p_user and double_day = p_day and completed_at is not null);
$f$ language sql stable security definer set search_path = public;

-- Misma función que 0073, con una sola diferencia: en tu Día doble cada 500 pasos dan 1 Punto y el tope es 40.
create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
  v_today date := local_today();
  v_allowed integer;
  v_steps integer;
  v_goal integer;
  v_per integer := 1000;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day = v_today - 1 then
    if not exists (select 1 from steps_daily where user_id = p_user_id and day = p_day) then
      return user_points_balance(p_user_id);
    end if;
  elsif p_day <> v_today then
    raise exception 'Fecha de sincronización inválida';
  end if;

  if not device_allows_steps(p_user_id) then
    return user_points_balance(p_user_id);
  end if;

  v_allowed := steps_allowed_at(p_day, now());
  v_steps := greatest(0, least(p_steps, v_allowed, 100000));

  select daily_goal into v_goal from profiles where id = p_user_id;

  insert into steps_daily (user_id, day, steps, updated_at, goal)
  values (p_user_id, p_day, v_steps, now(), v_goal)
  on conflict (user_id, day) do update
    set steps = greatest(steps_daily.steps, excluded.steps),
        updated_at = now(),
        goal = case when steps_daily.day = v_today then excluded.goal else coalesce(steps_daily.goal, excluded.goal) end;

  perform 1 from steps_daily where user_id = p_user_id and day = p_day for update;
  select steps into v_steps from steps_daily where user_id = p_user_id and day = p_day;

  if is_double_day(p_user_id, p_day) then
    v_per := 500;
    v_cap := v_cap * 2;
  end if;
  v_target_points := least(floor(v_steps / v_per::numeric)::integer, v_cap);

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

-- ---------- 9) Permisos ----------
revoke execute on function route_state(), route_join(), route_swap_options(), route_swap(uuid, uuid),
  route_mark_visit(uuid, text, double precision, double precision), route_business_visits(uuid),
  route_decide_visit(uuid, boolean), route_pick_double_day(date) from public, anon;
grant execute on function route_state(), route_join(), route_swap_options(), route_swap(uuid, uuid),
  route_mark_visit(uuid, text, double precision, double precision), route_business_visits(uuid),
  route_decide_visit(uuid, boolean), route_pick_double_day(date) to authenticated;
revoke execute on function route_eligible(uuid), is_double_day(uuid, date), route_month() from public, anon, authenticated;
