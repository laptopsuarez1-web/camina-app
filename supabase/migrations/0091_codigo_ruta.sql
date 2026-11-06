-- Código aparte para la Ruta del mes.
-- Cada local tiene ahora dos códigos de 4 números: el de canjes (0065) y uno solo para la Ruta. Así quien viene por la
-- Ruta no usa el código de canjes (y al revés), y el local sabe al instante por qué vino la persona.
-- La visita confirmada sigue sumando +2 puntos de nivel en el local (Visitante → Habitual → Fan), como antes.

create table if not exists business_route_codes (
  business_id uuid primary key references businesses (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  changed_at timestamptz not null default now()
);
alter table business_route_codes enable row level security;
drop policy if exists "business_route_codes: members read" on business_route_codes;
create policy "business_route_codes: members read" on business_route_codes for select
  using (is_business_member(business_id));
grant select on business_route_codes to authenticated;
-- Sin políticas de escritura: solo se cambia con reset_route_code().

-- Un código de 4 números distinto del código de canjes del mismo local.
create or replace function new_route_code(p_business uuid) returns text as $f$
declare
  v text;
  v_local text := (select code from business_local_codes where business_id = p_business);
begin
  loop
    v := new_local_code();
    exit when v is distinct from v_local;
  end loop;
  return v;
end;
$f$ language plpgsql volatile set search_path = public;

insert into business_route_codes (business_id, code)
select id, new_route_code(id) from businesses
on conflict (business_id) do nothing;

-- Locales nuevos: el código de la Ruta se crea después del de canjes (los triggers corren por nombre).
create or replace function create_route_code_for_business() returns trigger as $f$
begin
  insert into business_route_codes (business_id, code) values (new.id, new_route_code(new.id))
  on conflict (business_id) do nothing;
  return new;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists businesses_route_code on businesses;
create trigger businesses_route_code after insert on businesses
  for each row execute function create_route_code_for_business();

-- El panel lee su código (y si por algo no tiene, se crea).
create or replace function my_route_code(p_business uuid) returns text as $f$
declare v text;
begin
  if not is_business_member(p_business) then raise exception 'No autorizado'; end if;
  select code into v from business_route_codes where business_id = p_business;
  if v is null then
    insert into business_route_codes (business_id, code) values (p_business, new_route_code(p_business))
    on conflict (business_id) do nothing;
    select code into v from business_route_codes where business_id = p_business;
  end if;
  return v;
end;
$f$ language plpgsql security definer set search_path = public;

create or replace function reset_route_code(p_business uuid) returns text as $f$
declare v text;
begin
  if not is_business_member(p_business) then raise exception 'No autorizado'; end if;
  v := new_route_code(p_business);
  insert into business_route_codes (business_id, code, changed_at) values (p_business, v, now())
  on conflict (business_id) do update set code = excluded.code, changed_at = excluded.changed_at;
  return v;
end;
$f$ language plpgsql security definer set search_path = public;

-- La visita de la Ruta se marca con el código de la Ruta (igual que antes: cerca del local, 1 por local y mes, 5 intentos).
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
  if (select count(*) from route_visits where user_id = v_user and month = v_month and business_id = p_business) >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'demasiados_intentos');
  end if;
  select * into v_biz from businesses where id = p_business;
  select code into v_code from business_route_codes where business_id = p_business;
  if v_code is null then
    insert into business_route_codes (business_id, code) values (p_business, new_route_code(p_business))
    on conflict (business_id) do nothing;
    select code into v_code from business_route_codes where business_id = p_business;
  end if;
  if v_biz.lat is null then
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
    -- Escribió el código de canjes: se le avisa que la Ruta tiene su propio código.
    if p_code = (select code from business_local_codes where business_id = p_business) then
      return jsonb_build_object('ok', false, 'reason', 'codigo_de_canjes');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'codigo_incorrecto');
  end if;
  insert into route_visits (user_id, month, business_id, distance_m) values (v_user, v_month, p_business, v_dist);
  insert into business_notifications (business_id, title, body)
  values (p_business, 'Visita de la Ruta', 'Alguien vino por la Ruta del mes. Confirma en tu panel si compró.');
  return jsonb_build_object('ok', true);
end;
$f$ language plpgsql security definer set search_path = public;

revoke execute on function my_route_code(uuid), reset_route_code(uuid) from public, anon;
grant execute on function my_route_code(uuid), reset_route_code(uuid) to authenticated;
revoke execute on function new_route_code(uuid), create_route_code_for_business() from public, anon, authenticated;
