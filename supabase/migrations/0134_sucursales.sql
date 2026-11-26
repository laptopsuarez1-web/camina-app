-- 0134: sucursales de un comercio (pedido de Marcos, 2026-11-26).
--
-- Un comercio sigue siendo UNA sola ficha (plan, tarjeta, nivel, favoritos y premios son del comercio).
-- La ubicación que ya tiene el comercio (businesses.lat/lng/address) es la sucursal principal y no cambia;
-- businesses.branch_label le pone nombre ("Centro", "Av. Las Américas") cuando hay más sucursales.
-- Cada sucursal extra tiene nombre, dirección, ubicación, horario propio (opcional) y su propio código fijo de 4 números.
--
-- Premios: por defecto valen en todas las sucursales (como hasta ahora). Si el comercio elige sucursales,
-- el premio vale solo en esas (benefit_branches) y cada una puede tener sus cupos por día.
--
-- Compatibilidad: todo es nuevo o agrega columnas con valor por defecto; redeem_with_local_code mantiene su firma
-- y sus respuestas, así que las apps ya publicadas siguen funcionando igual. Los avisos nuevos ("este premio no
-- está en esta sucursal", "sin cupos hoy en esta sucursal") se mandan como mensaje del servidor, que las apps
-- viejas ya muestran tal cual.

-- ---------------------------------------------------------------------------------------------
-- Sucursales
-- ---------------------------------------------------------------------------------------------

alter table businesses add column if not exists branch_label text;
alter table businesses drop constraint if exists businesses_branch_label_len;
alter table businesses add constraint businesses_branch_label_len check (branch_label is null or char_length(branch_label) <= 60);

create table if not exists business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  address text check (address is null or char_length(address) <= 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  opening_hours jsonb,
  created_at timestamptz not null default now()
);
create index if not exists business_branches_business_idx on business_branches (business_id);

-- Hasta 20 sucursales además de la principal (sobra para un comercio de Bolivia y evita cargas por error).
create or replace function business_branches_limit() returns trigger
language plpgsql set search_path = public
as $f$
begin
  perform pg_advisory_xact_lock(hashtextextended('branches:' || new.business_id::text, 0));
  if (select count(*) from business_branches where business_id = new.business_id) >= 20 then
    raise exception 'Un comercio puede tener hasta 20 sucursales además de la principal.';
  end if;
  return new;
end;
$f$;
drop trigger if exists business_branches_limit_trg on business_branches;
create trigger business_branches_limit_trg before insert on business_branches
  for each row execute function business_branches_limit();

-- Una sucursal no se puede pasar a otro comercio.
create or replace function business_branches_keep_business() returns trigger
language plpgsql set search_path = public
as $f$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'No se puede mover una sucursal a otro comercio.';
  end if;
  return new;
end;
$f$;
drop trigger if exists business_branches_keep_business_trg on business_branches;
create trigger business_branches_keep_business_trg before update on business_branches
  for each row execute function business_branches_keep_business();

alter table business_branches enable row level security;
drop policy if exists "business_branches: public read" on business_branches;
create policy "business_branches: public read" on business_branches for select
  using (
    exists (select 1 from businesses b where b.id = business_id and ((b.approved and b.paused_at is null) or b.owner_user_id = auth.uid()))
    or is_business_member(business_id)
    or is_admin()
  );
drop policy if exists "business_branches: owner manages" on business_branches;
create policy "business_branches: owner manages" on business_branches for all
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()) or is_admin())
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid()) or is_admin());

grant select on business_branches to anon, authenticated;
grant insert, update, delete on business_branches to authenticated;

-- El código de cada sucursal vive aparte (igual que business_local_codes): solo lo leen el equipo del local y el admin.
create table if not exists business_branch_codes (
  branch_id uuid primary key references business_branches(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null,
  changed_at timestamptz not null default now()
);
alter table business_branch_codes enable row level security;
drop policy if exists "business_branch_codes: members read" on business_branch_codes;
create policy "business_branch_codes: members read" on business_branch_codes for select
  using (is_business_member(business_id) or is_admin());
grant select on business_branch_codes to authenticated;

create or replace function create_branch_code() returns trigger
language plpgsql security definer set search_path = public
as $f$
begin
  insert into business_branch_codes (branch_id, business_id, code) values (new.id, new.business_id, new_local_code())
  on conflict (branch_id) do nothing;
  return new;
end;
$f$;
drop trigger if exists business_branches_code_trg on business_branches;
create trigger business_branches_code_trg after insert on business_branches
  for each row execute function create_branch_code();

-- "Cambiar código" de una sucursal (igual que reset_local_code del local principal).
create or replace function reset_branch_code(p_branch_id uuid) returns text
language plpgsql security definer set search_path = public
as $f$
declare
  v_biz uuid;
  v_code text := new_local_code();
begin
  select business_id into v_biz from business_branches where id = p_branch_id;
  if v_biz is null or not (is_business_member(v_biz) or is_admin()) then
    raise exception 'No autorizado';
  end if;
  insert into business_branch_codes (branch_id, business_id, code, changed_at) values (p_branch_id, v_biz, v_code, now())
  on conflict (branch_id) do update set code = excluded.code, changed_at = excluded.changed_at;
  return v_code;
end;
$f$;
revoke all on function reset_branch_code(uuid) from public, anon;
grant execute on function reset_branch_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Premios por sucursal
-- ---------------------------------------------------------------------------------------------

-- Sin filas: el premio vale en todas las sucursales. Con filas: vale solo en esas.
-- branch_id null = la sucursal principal (la ubicación del comercio). daily_quota null = sin tope propio de la sucursal.
create table if not exists benefit_branches (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references benefits(id) on delete cascade,
  branch_id uuid references business_branches(id) on delete cascade,
  daily_quota integer check (daily_quota is null or daily_quota between 1 and 10000),
  created_at timestamptz not null default now(),
  constraint benefit_branches_unique unique nulls not distinct (benefit_id, branch_id)
);
create index if not exists benefit_branches_benefit_idx on benefit_branches (benefit_id);

-- La sucursal tiene que ser del mismo comercio que el premio.
create or replace function benefit_branches_same_business() returns trigger
language plpgsql set search_path = public
as $f$
begin
  if new.branch_id is not null and not exists (
    select 1 from business_branches br join benefits b on b.business_id = br.business_id
    where br.id = new.branch_id and b.id = new.benefit_id
  ) then
    raise exception 'Esa sucursal no es de este comercio.';
  end if;
  return new;
end;
$f$;
drop trigger if exists benefit_branches_same_business_trg on benefit_branches;
create trigger benefit_branches_same_business_trg before insert or update on benefit_branches
  for each row execute function benefit_branches_same_business();

alter table benefit_branches enable row level security;
drop policy if exists "benefit_branches: public read" on benefit_branches;
create policy "benefit_branches: public read" on benefit_branches for select
  using (exists (
    select 1 from benefits b join businesses biz on biz.id = b.business_id
    where b.id = benefit_id and ((b.active and biz.approved and biz.paused_at is null) or biz.owner_user_id = auth.uid())
  ) or is_admin());
drop policy if exists "benefit_branches: owner manages" on benefit_branches;
create policy "benefit_branches: owner manages" on benefit_branches for all
  using (exists (select 1 from benefits b join businesses biz on biz.id = b.business_id where b.id = benefit_id and biz.owner_user_id = auth.uid()) or is_admin())
  with check (exists (select 1 from benefits b join businesses biz on biz.id = b.business_id where b.id = benefit_id and biz.owner_user_id = auth.uid()) or is_admin());
grant select on benefit_branches to anon, authenticated;
grant insert, update, delete on benefit_branches to authenticated;

-- En qué sucursal se hizo cada canje (null = la principal, o un canje sin sucursal: online o de una app vieja).
alter table redemptions add column if not exists branch_id uuid references business_branches(id) on delete set null;
create index if not exists redemptions_benefit_branch_day_idx on redemptions (benefit_id, branch_id, created_at);

-- Cupos de hoy por sucursal, para que la app muestre "Quedan X hoy en esta sucursal".
create or replace function benefits_branch_remaining_today()
returns table (benefit_id uuid, branch_id uuid, daily_quota integer, redeemed_today integer)
language sql stable security definer set search_path = public
as $f$
  select bb.benefit_id, bb.branch_id, bb.daily_quota,
         (select count(*)::int from redemptions r
           where r.benefit_id = bb.benefit_id
             and r.branch_id is not distinct from bb.branch_id
             and r.status in ('pending', 'confirmed')
             and (r.created_at at time zone 'America/La_Paz')::date = local_today())
  from benefit_branches bb
  join benefits b on b.id = bb.benefit_id
  join businesses biz on biz.id = b.business_id
  where bb.daily_quota is not null and b.active and biz.approved and biz.paused_at is null;
$f$;


-- ---------------------------------------------------------------------------------------------
-- Canje con el código del local: vale el código de la sucursal donde está la persona (a menos de 300 m)
-- ---------------------------------------------------------------------------------------------

create or replace function redeem_with_local_code(p_benefit_id uuid, p_code text, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql security definer set search_path = public
as $f$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_biz businesses%rowtype;
  v_code text;
  v_dist integer;
  v_best integer;
  v_has_code boolean := false;
  v_near boolean := false;
  v_ok boolean := false;
  v_match_dist integer;
  v_match_branch uuid;
  v_match_name text;
  v_restricted boolean;
  v_rule benefit_branches%rowtype;
  v_used integer;
  v_red redemptions;
  r record;
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

  -- Lugares del comercio: la principal (código del local) y cada sucursal (su propio código).
  -- Vale el código de un lugar que esté a menos de 300 m; si hay dos pegados, sirve el de cualquiera de los dos.
  for r in
    select null::uuid as branch_id, coalesce(nullif(btrim(v_biz.branch_label), ''), 'principal') as name,
           v_biz.lat as lat, v_biz.lng as lng, v_code as code
      where v_code is not null and v_biz.lat is not null and v_biz.lng is not null
    union all
    select br.id, br.name, br.lat, br.lng, bc.code
      from business_branches br join business_branch_codes bc on bc.branch_id = br.id
      where br.business_id = v_biz.id
  loop
    v_has_code := true;
    if p_lat is null or p_lng is null then
      exit;
    end if;
    v_dist := distance_m(r.lat, r.lng, p_lat, p_lng);
    if v_best is null or v_dist < v_best then
      v_best := v_dist;
    end if;
    if v_dist <= local_code_max_distance_m() then
      v_near := true;
      if not v_ok and p_code is not distinct from r.code then
        v_ok := true;
        v_match_dist := v_dist;
        v_match_branch := r.branch_id;
        v_match_name := r.name;
      end if;
    end if;
  end loop;

  if not v_has_code then
    return jsonb_build_object('ok', false, 'reason', 'sin_codigo');
  end if;
  if p_lat is null or p_lng is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_ubicacion');
  end if;
  if not v_near then
    return jsonb_build_object('ok', false, 'reason', 'lejos', 'distance_m', v_best);
  end if;
  if code_attempts_left(v_user, v_biz.id, 'local') = 0 then
    raise exception 'Probaste muchos códigos equivocados en este local. Pide el código en la caja y vuelve a intentar en un rato.';
  end if;
  if not v_ok then
    insert into code_attempts (user_id, business_id, kind) values (v_user, v_biz.id, 'local');
    return jsonb_build_object('ok', false, 'reason', 'codigo_incorrecto');
  end if;

  -- Premio elegido solo para algunas sucursales: tiene que valer en esta, y respetar sus cupos de hoy.
  -- El premio queda bloqueado hasta terminar, así dos canjes al mismo tiempo no se pasan del cupo.
  -- Primero el mismo candado por persona que usa redeem_benefit (mismo orden de candados: sin bloqueos cruzados).
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  perform 1 from benefits where id = p_benefit_id for update;
  v_restricted := exists (select 1 from benefit_branches where benefit_id = p_benefit_id);
  if v_restricted then
    select * into v_rule from benefit_branches where benefit_id = p_benefit_id and branch_id is not distinct from v_match_branch;
    if not found then
      raise exception 'Este premio no está en la sucursal %. Mira en la ficha en qué sucursales vale.', v_match_name;
    end if;
    if v_rule.daily_quota is not null and not exists (select 1 from qa_accounts where user_id = v_user) then
      select count(*) into v_used from redemptions
      where benefit_id = p_benefit_id
        and branch_id is not distinct from v_match_branch
        and status in ('pending', 'confirmed')
        and (created_at at time zone 'America/La_Paz')::date = local_today();
      if v_used >= v_rule.daily_quota then
        raise exception 'Se agotaron los cupones de hoy de este premio en la sucursal %.', v_match_name;
      end if;
    end if;
  end if;

  v_red := redeem_benefit(p_benefit_id);
  update redemptions set branch_id = v_match_branch where id = v_red.id;
  v_red := finish_redemption(v_red.id, null, 'local_code', v_match_dist);
  return jsonb_build_object('ok', true, 'redemption', to_jsonb(v_red));
end;
$f$;

-- El panel guarda en qué sucursales vale un premio de una sola vez (todo o nada).
-- p_rules: lista de {branch_id (null = principal), daily_quota (null = sin tope propio)}; vacía o null = vale en todas.
-- Los premios online no dependen de la sucursal: siempre quedan "en todas".
create or replace function set_benefit_branches(p_benefit_id uuid, p_rules jsonb) returns void
language plpgsql security definer set search_path = public
as $f$
declare
  v_biz uuid;
  v_online boolean;
  r jsonb;
  v_quota integer;
begin
  select b.business_id, b.online into v_biz, v_online from benefits b where b.id = p_benefit_id;
  if v_biz is null or not (exists (select 1 from businesses where id = v_biz and owner_user_id = auth.uid()) or is_admin()) then
    raise exception 'No autorizado';
  end if;
  if p_rules is not null and jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Formato inválido';
  end if;
  delete from benefit_branches where benefit_id = p_benefit_id;
  if p_rules is null or jsonb_array_length(p_rules) = 0 or v_online then
    return;
  end if;
  for r in select value from jsonb_array_elements(p_rules) loop
    v_quota := nullif(r->>'daily_quota', '')::integer;
    if v_quota is not null and (v_quota < 1 or v_quota > 10000) then
      raise exception 'Los cupos por sucursal van de 1 a 10.000 por día.';
    end if;
    insert into benefit_branches (benefit_id, branch_id, daily_quota)
    values (p_benefit_id, nullif(r->>'branch_id', '')::uuid, v_quota)
    on conflict on constraint benefit_branches_unique do update set daily_quota = excluded.daily_quota;
  end loop;
end;
$f$;

-- ---------------------------------------------------------------------------------------------
-- Permisos (como 0034/0065): sin sesión no se ejecuta nada; los disparadores no los llama nadie a mano.
-- ---------------------------------------------------------------------------------------------
revoke execute on function business_branches_limit(), business_branches_keep_business(), create_branch_code(),
  benefit_branches_same_business() from public, anon, authenticated;
revoke execute on function benefits_branch_remaining_today() from public, anon;
grant execute on function benefits_branch_remaining_today() to authenticated;
revoke execute on function redeem_with_local_code(uuid, text, double precision, double precision) from public, anon;
grant execute on function redeem_with_local_code(uuid, text, double precision, double precision) to authenticated;
revoke execute on function set_benefit_branches(uuid, jsonb) from public, anon;
grant execute on function set_benefit_branches(uuid, jsonb) to authenticated;
