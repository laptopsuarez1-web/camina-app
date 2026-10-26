-- Canje con código del local (4 números): la persona lo escribe en la app, estando cerca del local, y el canje queda
-- confirmado al instante, sin que el local abra el panel. El panel con el código de 6 números sigue funcionando igual.
-- Todo con bloques $f$ para poder aplicarlo por la API.

-- ---------- 1) Código de cada local (tabla aparte: businesses se lee en público) ----------
create table if not exists business_local_codes (
  business_id uuid primary key references businesses (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  changed_at timestamptz not null default now()
);
alter table business_local_codes enable row level security;
drop policy if exists "business_local_codes: members read" on business_local_codes;
create policy "business_local_codes: members read" on business_local_codes for select
  using (is_business_member(business_id));
-- Sin políticas de escritura: solo se cambia con reset_local_code().

create or replace function new_local_code() returns text as $f$
  select lpad(floor(random() * 10000)::int::text, 4, '0');
$f$ language sql volatile set search_path = public;

insert into business_local_codes (business_id, code)
select id, new_local_code() from businesses
on conflict (business_id) do nothing;

create or replace function create_local_code_for_business() returns trigger as $f$
begin
  insert into business_local_codes (business_id, code) values (new.id, new_local_code())
  on conflict (business_id) do nothing;
  return new;
end;
$f$ language plpgsql security definer set search_path = public;
drop trigger if exists businesses_local_code on businesses;
create trigger businesses_local_code after insert on businesses
  for each row execute function create_local_code_for_business();

-- El local cambia su código cuando quiere (por ejemplo si se filtró).
create or replace function reset_local_code(p_business_id uuid) returns text as $f$
declare
  v_code text := new_local_code();
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;
  insert into business_local_codes (business_id, code, changed_at) values (p_business_id, v_code, now())
  on conflict (business_id) do update
    set code = excluded.code, changed_at = excluded.changed_at
    where business_local_codes.code is distinct from excluded.code;
  select code into v_code from business_local_codes where business_id = p_business_id;
  return v_code;
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- 2) Cómo se confirmó cada canje ----------
alter table redemptions add column if not exists confirmed_via text not null default 'panel'
  check (confirmed_via in ('panel', 'local_code'));
alter table redemptions add column if not exists confirm_distance_m integer;

-- ---------- 3) Confirmación compartida (la usan el panel y el código del local) ----------
-- Es la misma lógica de confirm_redemption_code (0058): descuenta Puntos, bono de local nuevo, aviso.
-- La validación de quién confirma queda en cada función que la llama.
create or replace function finish_redemption(p_redemption_id uuid, p_by uuid, p_via text, p_distance integer)
returns redemptions as $f$
declare
  v_row redemptions;
  v_was_charged boolean;
  v_bname text;
  v_plan business_plan;
  v_bonus integer := new_place_bonus_points();
begin
  select * into v_row from redemptions where id = p_redemption_id and status = 'pending' for update;
  if not found then
    raise exception 'Ese código ya venció';
  end if;

  v_was_charged := v_row.points_charged;

  update redemptions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = p_by, points_charged = true,
      confirmed_via = p_via, confirm_distance_m = p_distance
  where id = v_row.id
  returning * into v_row;

  select name, plan into v_bname, v_plan from businesses where id = v_row.business_id;

  if not v_was_charged and v_row.cost_points > 0 then
    insert into points_ledger (user_id, amount, reason, note)
    values (v_row.user_id, -v_row.cost_points, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
  end if;

  if v_plan in ('paso_firme', 'paso_adelante')
     and not exists (select 1 from qa_accounts where user_id = v_row.user_id)
     and not exists (
       select 1 from redemptions r
       where r.user_id = v_row.user_id and r.business_id = v_row.business_id
         and r.status = 'confirmed' and r.id <> v_row.id
     ) then
    insert into points_ledger (user_id, amount, reason, expires_at, note)
    values (v_row.user_id, v_bonus, 'challenge', now() + (points_ttl_days() || ' days')::interval,
            'Primera vez en ' || coalesce(v_bname, 'un local'));
    update redemptions set new_place_bonus = v_bonus where id = v_row.id returning * into v_row;

    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (v_row.user_id, '¡+' || v_bonus || ' Puntos por probar un local nuevo! 🎉',
            'Es tu primera vez en ' || coalesce(v_bname, 'este local') || '. Te acreditamos ' || v_bonus || ' Puntos.',
            jsonb_build_object('type', 'new_place', 'business_id', v_row.business_id),
            'new_place:' || v_row.user_id || ':' || v_row.business_id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;
revoke execute on function finish_redemption(uuid, uuid, text, integer) from public, anon, authenticated;

create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $f$
declare
  v_row redemptions;
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;

  select * into v_row from redemptions
  where business_id = p_business_id and code = p_code
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Código no encontrado';
  end if;

  if v_row.status = 'confirmed' then
    raise exception 'Ese código ya fue confirmado';
  end if;

  if v_row.status <> 'pending' or v_row.code_expires_at < now() then
    update redemptions set status = 'expired' where id = v_row.id and status = 'pending';
    raise exception 'Ese código ya venció';
  end if;

  return finish_redemption(v_row.id, auth.uid(), 'panel', null);
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- 4) Canje con el código del local ----------
-- Distancia en metros entre dos puntos (fórmula de haversine).
create or replace function distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns integer as $f$
  select round(2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))::int;
$f$ language sql immutable set search_path = public;

create or replace function local_code_max_distance_m() returns integer as $f$
  select 300;
$f$ language sql immutable;

-- Devuelve {ok:true, redemption:{...}} o {ok:false, reason:'codigo_incorrecto'|'lejos'|'sin_ubicacion'|'sin_codigo'}.
-- Los errores de reglas del canje (saldo, espera de 7 días, cupos, horario) salen como excepción, igual que redeem_benefit.
create or replace function redeem_with_local_code(
  p_benefit_id uuid, p_code text, p_lat double precision, p_lng double precision
) returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_biz businesses%rowtype;
  v_code text;
  v_dist integer;
  v_red redemptions;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  select * into v_benefit from benefits where id = p_benefit_id and active;
  if not found then
    raise exception 'Beneficio no disponible';
  end if;
  if v_benefit.online then
    return jsonb_build_object('ok', false, 'reason', 'sin_codigo');
  end if;
  select * into v_biz from businesses where id = v_benefit.business_id;
  select code into v_code from business_local_codes where business_id = v_biz.id;
  if v_code is null or v_biz.lat is null or v_biz.lng is null then
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

  -- Código correcto y cerca: se aplican las reglas de siempre (saldo, espera, cupos, horario) y se confirma en el acto.
  v_red := redeem_benefit(p_benefit_id);
  v_red := finish_redemption(v_red.id, null, 'local_code', v_dist);
  return jsonb_build_object('ok', true, 'redemption', to_jsonb(v_red));
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- Permisos ----------
revoke execute on function reset_local_code(uuid) from public, anon;
grant execute on function reset_local_code(uuid) to authenticated;
revoke execute on function redeem_with_local_code(uuid, text, double precision, double precision) from public, anon;
grant execute on function redeem_with_local_code(uuid, text, double precision, double precision) to authenticated;
revoke execute on function new_local_code(), distance_m(double precision, double precision, double precision, double precision),
  local_code_max_distance_m(), create_local_code_for_business() from public, anon, authenticated;
