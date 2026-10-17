-- 0057 — Tarjeta de fidelidad por local, espera de 7 días entre canjes y Puntos ×1,25 (2,5 Puntos = Bs 1)
--
-- Decisiones de Suarez (2026-10-17):
-- - Cada local tiene su tarjeta de 5 sellos. Un sello = un canje CONFIRMADO por el local. Con 5 sellos, el próximo canje
--   del premio de fidelidad que el local eligió sale gratis (0 Puntos) y la tarjeta vuelve a cero. No hay tarjeta general.
-- - Solo para los planes de pago: Paso Firme (Bs 100) y Paso Adelante (Bs 300). Si el local baja a Primer Paso, la tarjeta se apaga.
-- - La espera entre canjes en el mismo local baja de 14 a 7 días (la regla y el aviso ya existían).
-- - Los 7 premios que hoy existen suben ×1,25 (redondeo hacia arriba). La app todavía no salió: no se ajustan saldos ni se avisa a nadie.
--   Ganar Puntos queda igual (1 cada 1.000 pasos, hasta 20 por día).
-- - Camina no paga nada: el premio gratis lo pone el local, Camina solo deja de cobrar los Puntos.
--
-- Qué agrega:
-- - businesses.loyalty_benefit_id: el premio de fidelidad que elige el local (set_loyalty_benefit).
-- - redemptions.loyalty_free: el canje salió gratis por la tarjeta (cost_points = 0, no se descuenta nada al confirmar).
-- - loyalty_stamps(): sellos = canjes confirmados desde el último canje gratis (pendiente o confirmado) en ese local.
-- - my_loyalty_cards(): las tarjetas de la persona (para la ficha del local y "Ver mis tarjetas").
-- - business_loyalty_overview(): resumen y "clientes cerca de completar" para el panel (solo nombre de pila e inicial).
-- - redeem_benefit y confirm_redemption_code (de la 0054) con la regla de la tarjeta.
-- Idempotente: sí (la subida ×1,25 de premios corre una sola vez, marcada en app_config).
-- Se revierte: business_redemption_cooldown_days() vuelve a 14; las columnas nuevas se pueden dejar sin uso.

alter table businesses add column if not exists loyalty_benefit_id uuid references benefits (id) on delete set null;
alter table redemptions add column if not exists loyalty_free boolean not null default false;

-- Espera entre canjes en el mismo local: 7 días.
create or replace function business_redemption_cooldown_days() returns integer
language sql immutable set search_path = public
as $f$ select 7 $f$;

-- Sellos para completar la tarjeta.
create or replace function loyalty_goal() returns integer
language sql immutable set search_path = public
as $f$ select 5 $f$;

-- La tarjeta existe solo en Paso Firme y Paso Adelante, con un premio elegido y activo.
create or replace function loyalty_enabled(p_business uuid) returns boolean
language sql stable security definer set search_path = public
as $f$
  select exists (
    select 1 from businesses b
    join benefits be on be.id = b.loyalty_benefit_id and be.business_id = b.id and be.active
    where b.id = p_business and b.plan in ('paso_firme', 'paso_adelante')
  );
$f$;

-- Sellos de una persona en un local: canjes confirmados (que no fueron el gratis) desde su último canje gratis.
create or replace function loyalty_stamps(p_user uuid, p_business uuid) returns integer
language sql stable security definer set search_path = public
as $f$
  select count(*)::integer
  from redemptions r
  where r.user_id = p_user and r.business_id = p_business
    and r.status = 'confirmed' and not r.loyalty_free
    and r.created_at > coalesce(
      (select max(f.created_at) from redemptions f
        where f.user_id = p_user and f.business_id = p_business
          and f.loyalty_free and f.status in ('pending', 'confirmed')),
      '-infinity'::timestamptz);
$f$;

revoke execute on function loyalty_enabled(uuid), loyalty_stamps(uuid, uuid) from public, anon, authenticated;
grant execute on function loyalty_enabled(uuid), loyalty_stamps(uuid, uuid) to service_role;
revoke execute on function loyalty_goal() from public, anon;
grant execute on function loyalty_goal() to authenticated, service_role;

-- ---------- El local elige su premio de fidelidad ----------
create or replace function set_loyalty_benefit(p_business_id uuid, p_benefit_id uuid) returns uuid
language plpgsql security definer set search_path = public
as $f$
declare
  v_plan business_plan;
begin
  select plan into v_plan from businesses where id = p_business_id and owner_user_id = auth.uid();
  if not found then
    raise exception 'No autorizado';
  end if;
  if p_benefit_id is not null then
    if v_plan not in ('paso_firme', 'paso_adelante') then
      raise exception 'La tarjeta de fidelidad es de Paso Firme (Bs 100) y Paso Adelante (Bs 300)';
    end if;
    if not exists (select 1 from benefits where id = p_benefit_id and business_id = p_business_id and active) then
      raise exception 'Ese premio no está disponible';
    end if;
  end if;
  update businesses set loyalty_benefit_id = p_benefit_id where id = p_business_id;
  return p_benefit_id;
end;
$f$;
revoke execute on function set_loyalty_benefit(uuid, uuid) from public, anon;
grant execute on function set_loyalty_benefit(uuid, uuid) to authenticated;

-- ---------- Mis tarjetas ----------
-- Sin parámetro: las tarjetas de los locales donde la persona ya sumó al menos un sello (o tiene el premio listo).
-- Con un local: la tarjeta de ese local aunque esté en cero (la ficha); si el local no tiene tarjeta, no devuelve filas.
create or replace function my_loyalty_cards(p_business_id uuid default null)
returns table (
  business_id uuid, business_name text, logo_url text,
  benefit_id uuid, benefit_name text, benefit_cost integer,
  stamps integer, goal integer, ready boolean,
  last_redeemed_at timestamptz, next_allowed_at timestamptz, history timestamptz[]
)
language sql stable security definer set search_path = public
as $f$
  with mine as (
    select b.id, b.name, b.logo_url, be.id as bid, be.name as bname, be.cost_points,
           least(loyalty_stamps(auth.uid(), b.id), loyalty_goal()) as st
    from businesses b
    join benefits be on be.id = b.loyalty_benefit_id and be.business_id = b.id and be.active
    where auth.uid() is not null
      and b.plan in ('paso_firme', 'paso_adelante')
      and (p_business_id is null or b.id = p_business_id)
  )
  select m.id, m.name, m.logo_url, m.bid, m.bname, m.cost_points, m.st, loyalty_goal(), m.st >= loyalty_goal(),
         (select max(r.created_at) from redemptions r where r.user_id = auth.uid() and r.business_id = m.id and r.status in ('pending', 'confirmed')),
         (select max(r.created_at) + (business_redemption_cooldown_days() || ' days')::interval from redemptions r
            where r.user_id = auth.uid() and r.business_id = m.id and r.status in ('pending', 'confirmed')),
         coalesce((select array_agg(x.created_at order by x.created_at desc) from (
            select r.created_at from redemptions r
            where r.user_id = auth.uid() and r.business_id = m.id and r.status = 'confirmed'
            order by r.created_at desc limit 10) x), '{}')
  from mine m
  where p_business_id is not null or m.st > 0
  order by m.st desc, m.name;
$f$;
revoke execute on function my_loyalty_cards(uuid) from public, anon;
grant execute on function my_loyalty_cards(uuid) to authenticated;

-- ---------- Resumen para el panel del comercio ----------
create or replace function business_loyalty_overview(p_business_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public
as $f$
declare
  v_goal integer := loyalty_goal();
  v_plan business_plan;
  v_benefit uuid;
  v_benefit_name text;
  v_customers integer;
  v_missing_one integer;
  v_ready integer;
  v_delivered integer;
  v_close jsonb;
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;
  select b.plan, b.loyalty_benefit_id into v_plan, v_benefit from businesses b where b.id = p_business_id;
  select name into v_benefit_name from benefits where id = v_benefit and business_id = p_business_id and active;

  if v_plan not in ('paso_firme', 'paso_adelante') then
    return jsonb_build_object('plan_ok', false, 'goal', v_goal);
  end if;
  if v_benefit_name is null then
    return jsonb_build_object('plan_ok', true, 'goal', v_goal, 'benefit_id', null, 'customers', 0, 'missing_one', 0,
                              'ready_unused', 0, 'delivered_month', 0, 'close', '[]'::jsonb);
  end if;

  with cards as (
    select u.user_id,
           coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'Cliente')
             || coalesce(' ' || nullif(upper(left(nullif(split_part(btrim(p.full_name), ' ', 2), ''), 1)), '') || '.', '') as name,
           least(loyalty_stamps(u.user_id, p_business_id), v_goal) as stamps,
           (select max(r.created_at) from redemptions r
             where r.user_id = u.user_id and r.business_id = p_business_id and r.status in ('pending', 'confirmed')) as last_at
    from (select distinct user_id from redemptions where business_id = p_business_id and status = 'confirmed') u
    left join profiles p on p.id = u.user_id
  )
  select count(*) filter (where stamps > 0),
         count(*) filter (where stamps = v_goal - 1),
         count(*) filter (where stamps >= v_goal),
         coalesce(jsonb_agg(jsonb_build_object(
           'name', name, 'stamps', stamps, 'last_at', last_at,
           'can_return_at', last_at + (business_redemption_cooldown_days() || ' days')::interval)
           order by stamps desc, last_at desc) filter (where stamps >= v_goal - 2), '[]'::jsonb)
    into v_customers, v_missing_one, v_ready, v_close
  from cards;

  select count(*) into v_delivered from redemptions
   where business_id = p_business_id and loyalty_free and status = 'confirmed'
     and confirmed_at >= date_trunc('month', now() at time zone 'America/La_Paz') at time zone 'America/La_Paz';

  return jsonb_build_object('plan_ok', true, 'goal', v_goal, 'benefit_id', v_benefit, 'benefit_name', v_benefit_name,
    'customers', v_customers, 'missing_one', v_missing_one, 'ready_unused', v_ready, 'delivered_month', v_delivered, 'close', v_close);
end;
$f$;
revoke execute on function business_loyalty_overview(uuid) from public, anon;
grant execute on function business_loyalty_overview(uuid) to authenticated;

-- ---------- redeem_benefit (0054) + regla de la tarjeta ----------
create or replace function redeem_benefit(p_benefit_id uuid) returns redemptions as $f$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_balance integer;
  v_cooldown_until timestamptz;
  v_now timestamptz := now();
  v_local_time time := (v_now at time zone 'America/La_Paz')::time;
  v_dow smallint;
  v_row redemptions;
  v_qa boolean;
  v_bname text;
  v_cost integer;
  v_free boolean := false;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  -- Un solo gasto de Puntos a la vez por persona: dos canjes simultáneos ya no leen el mismo saldo ni saltean el cooldown (SEC-06).
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  v_qa := exists (select 1 from qa_accounts where user_id = v_user);

  select * into v_benefit from benefits where id = p_benefit_id and active for update;
  if not found then
    raise exception 'Beneficio no disponible';
  end if;
  select name into v_bname from businesses where id = v_benefit.business_id;

  v_dow := extract(isodow from (v_now at time zone 'America/La_Paz'))::smallint - 1;
  if (v_benefit.valid_days_mask & (1 << v_dow)) = 0 then
    raise exception 'Este beneficio no está disponible hoy';
  end if;
  if v_benefit.valid_from is not null and v_benefit.valid_to is not null then
    if v_benefit.valid_from <= v_benefit.valid_to then
      if not (v_local_time between v_benefit.valid_from and v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    else
      if not (v_local_time >= v_benefit.valid_from or v_local_time <= v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    end if;
  end if;

  if not v_qa then
    select max(created_at) into v_cooldown_until
    from redemptions
    where user_id = v_user
      and business_id = v_benefit.business_id
      and status in ('pending', 'confirmed')
      and created_at > v_now - (business_redemption_cooldown_days() || ' days')::interval;
    if v_cooldown_until is not null then
      raise exception 'Ya canjeaste en este comercio hace menos de % días', business_redemption_cooldown_days();
    end if;

    if v_benefit.daily_quota is not null and (select count(*) from redemptions
        where benefit_id = p_benefit_id
          and status in ('pending', 'confirmed')
          and (created_at at time zone 'America/La_Paz')::date = local_today()) >= v_benefit.daily_quota then
      raise exception 'Se agotaron los cupones de hoy para este beneficio';
    end if;
  end if;

  -- Tarjeta de fidelidad: con la tarjeta completa, el premio de fidelidad sale gratis (0 Puntos).
  v_cost := v_benefit.cost_points;
  if loyalty_enabled(v_benefit.business_id)
     and exists (select 1 from businesses where id = v_benefit.business_id and loyalty_benefit_id = v_benefit.id)
     and loyalty_stamps(v_user, v_benefit.business_id) >= loyalty_goal() then
    v_free := true;
    v_cost := 0;
  end if;

  v_balance := user_points_balance(v_user) - user_points_reserved(v_user);
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente';
  end if;

  -- Los Puntos NO se descuentan acá: se reservan mientras el código está vigente y se descuentan cuando el local lo confirma.

  insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_cost, false, v_free,
    generate_redemption_code(), v_now + (redemption_code_ttl_minutes() || ' minutes')::interval
  )
  returning * into v_row;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- confirm_redemption_code (0054): un canje gratis no mueve Puntos ----------
create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $f$
declare
  v_row redemptions;
  v_was_charged boolean;
  v_bname text;
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

  v_was_charged := v_row.points_charged;

  update redemptions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(), points_charged = true
  where id = v_row.id
  returning * into v_row;

  -- Los canjes viejos ya descontaron al generar el código; los nuevos se descuentan recién acá (salvo el gratis de la tarjeta).
  if not v_was_charged and v_row.cost_points > 0 then
    select name into v_bname from businesses where id = v_row.business_id;
    insert into points_ledger (user_id, amount, reason, note)
    values (v_row.user_id, -v_row.cost_points, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
  end if;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- Puntos ×1,25: los premios existentes (una sola vez) ----------
do $f$
begin
  if not exists (select 1 from app_config where key = 'points_scale_2_5') then
    update benefits set cost_points = ceil(cost_points * 1.25)::integer;
    insert into app_config (key, value) values ('points_scale_2_5', 'premios x1,25 aplicados');
  end if;
end;
$f$;
