-- 0080 — Tarjeta de fidelidad GENERAL de Camina (reemplaza la tarjeta por local de la 0057)
--
-- Decisión de Suarez/Marcos (2026-11-02):
-- - Una sola tarjeta por persona: cada canje CONFIRMADO en cualquier comercio suma un sello. Con 5 sellos la tarjeta se completa
--   y la persona elige UN premio gratis entre los comercios que participan. El comercio pone el premio (Camina no paga nada);
--   a cambio tiene visibilidad en la lista de premios.
-- - La tarjeta completa vence a los 30 días de completarse. Mientras tanto la persona puede salir y volver, y cambiar el premio
--   elegido hasta que lo canjea. Se canjea como siempre: en el local, con su código de 4 números (redeem_with_local_code).
-- - Participan los locales Paso Firme y Paso Adelante que eligieron su "premio de fidelidad" (businesses.loyalty_benefit_id, de la 0057).
--   Si el local baja de plan o cambia su premio después de que la persona eligió, la persona conserva el que eligió hasta que venza.
-- - El canje gratis no cuenta como sello y no está sujeto a la espera de 14 días del local (no habría salida si el premio es del
--   mismo local donde canjeó hace poco).
-- - Las tarjetas por local en curso se descartan (la app todavía no salió con ellas). Los canjes ya hechos SÍ cuentan: 5 canjes
--   confirmados sin tarjeta previa completan la tarjeta.
--
-- Qué agrega:
-- - loyalty_cards: una fila por tarjeta COMPLETADA (open / used / expired).  redemptions.loyalty_card_id: el canje gratis de esa tarjeta.
-- - camina_sync_card(user): crea las tarjetas completadas que falten y vence las que pasaron los 30 días.
-- - my_camina_card(): la tarjeta de la persona (sellos, premio elegido, opciones, historial, tarjetas anteriores) en un solo JSON.
-- - choose_camina_prize(benefit): elige o cambia el premio.
-- - business_loyalty_overview(): resumen para el panel del comercio (quiénes eligieron su premio, entregados).
-- - queue_camina_card_notifications(): avisos a 7 y 2 días del vencimiento (pg_cron diario).
-- - redeem_benefit (de la 0060) y finish_redemption (de la 0065) con la regla de la tarjeta general.
-- Se quitan: my_loyalty_cards, loyalty_stamps, (la tarjeta por local).
-- Idempotente: sí. Se revierte volviendo a aplicar 0057/0060/0065 y dejando la tabla sin uso.

-- ---------- Tablas y columnas ----------
create table if not exists loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  -- Número de la tarjeta de esta persona (1, 2, 3...): la n se completa en el sello 5n.
  seq integer not null,
  completed_at timestamptz not null,
  expires_at timestamptz not null,
  chosen_benefit_id uuid references benefits (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'used', 'expired')),
  closed_at timestamptz,
  used_redemption_id uuid references redemptions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, seq)
);
create index if not exists loyalty_cards_user_idx on loyalty_cards (user_id, status);
alter table loyalty_cards enable row level security;
drop policy if exists "loyalty_cards: select own" on loyalty_cards;
create policy "loyalty_cards: select own" on loyalty_cards for select using (auth.uid() = user_id);
-- Sin políticas de escritura: todo pasa por las funciones de abajo.
revoke all on loyalty_cards from public, anon;
grant select on loyalty_cards to authenticated;

alter table redemptions add column if not exists loyalty_card_id uuid references loyalty_cards (id) on delete set null;

create or replace function loyalty_card_days() returns integer
language sql immutable set search_path = public
as $f$ select 30 $f$;
revoke execute on function loyalty_card_days() from public, anon;
grant execute on function loyalty_card_days() to authenticated, service_role;

-- ---------- Tarjetas completadas ----------
-- Los sellos de una persona son sus canjes confirmados que no fueron el gratis, en orden. Cada tarjeta consume 5: la tarjeta número n
-- se completa en el sello 5n, y su fecha es la del canje que la completó.
create or replace function camina_sync_card(p_user uuid) returns void
language plpgsql security definer set search_path = public
as $f$
declare
  v_n integer;
  v_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('camina_card:' || p_user::text, 0));
  loop
    select count(*) into v_n from loyalty_cards where user_id = p_user;
    select s.ts into v_at from (
      select coalesce(r.confirmed_at, r.created_at) as ts, r.id
      from redemptions r
      where r.user_id = p_user and r.status = 'confirmed' and not r.loyalty_free
      order by coalesce(r.confirmed_at, r.created_at), r.id
      offset (v_n + 1) * loyalty_goal() - 1 limit 1
    ) s;
    exit when v_at is null;
    insert into loyalty_cards (user_id, seq, completed_at, expires_at)
    values (p_user, v_n + 1, v_at, v_at + (loyalty_card_days() || ' days')::interval)
    on conflict (user_id, seq) do nothing;
    exit when not found;
  end loop;
  update loyalty_cards set status = 'expired', closed_at = expires_at
  where user_id = p_user and status = 'open' and expires_at <= now();
end;
$f$;
revoke execute on function camina_sync_card(uuid) from public, anon, authenticated;
grant execute on function camina_sync_card(uuid) to service_role;

-- ---------- Premios que participan ----------
-- Un premio participa si es el "premio de fidelidad" de un local de pago, está activo y el local está aprobado.
create or replace function camina_prize_json(p_benefit uuid) returns jsonb
language sql stable security definer set search_path = public
as $f$
  select jsonb_build_object(
    'benefit_id', be.id, 'benefit_name', be.name, 'description', be.description, 'image_url', be.image_url,
    'discount_detail', be.discount_detail, 'discount_percent', be.discount_percent, 'dine_in_only', be.dine_in_only,
    'valid_from', be.valid_from, 'valid_to', be.valid_to, 'valid_days_mask', be.valid_days_mask,
    'online', be.online, 'online_channel', be.online_channel,
    'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
      'address', b.address, 'lat', b.lat, 'lng', b.lng, 'hours_text', b.hours_text, 'opening_hours', b.opening_hours))
  from benefits be join businesses b on b.id = be.business_id
  where be.id = p_benefit;
$f$;
revoke execute on function camina_prize_json(uuid) from public, anon, authenticated;
grant execute on function camina_prize_json(uuid) to service_role;

create or replace function camina_prize_participates(p_benefit uuid) returns boolean
language sql stable security definer set search_path = public
as $f$
  select exists (
    select 1 from benefits be join businesses b on b.id = be.business_id
    where be.id = p_benefit and be.active and b.loyalty_benefit_id = be.id and b.approved
      and b.plan in ('paso_firme', 'paso_adelante')
  );
$f$;
revoke execute on function camina_prize_participates(uuid) from public, anon, authenticated;
grant execute on function camina_prize_participates(uuid) to service_role;

-- ---------- Mi tarjeta ----------
create or replace function my_camina_card() returns jsonb
language plpgsql security definer set search_path = public
as $f$
declare
  v_user uuid := auth.uid();
  v_goal integer := loyalty_goal();
  v_card loyalty_cards%rowtype;
  v_cards integer;
  v_total integer;
  v_stamps integer;
  v_options jsonb := '[]'::jsonb;
  v_history jsonb;
  v_past jsonb;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform camina_sync_card(v_user);

  select * into v_card from loyalty_cards where user_id = v_user and status = 'open' order by seq desc limit 1;
  select count(*) into v_cards from loyalty_cards where user_id = v_user;
  select count(*) into v_total from redemptions where user_id = v_user and status = 'confirmed' and not loyalty_free;

  if v_card.id is not null then
    v_stamps := v_goal;
    -- Los premios en orden "parejo" por persona (no siempre los mismos primero), más el que ya eligió aunque haya dejado de participar.
    select coalesce(jsonb_agg(camina_prize_json(x.id) order by x.ord), '[]'::jsonb) into v_options from (
      select be.id, md5(v_user::text || be.id::text) as ord
      from benefits be join businesses b on b.id = be.business_id
      where camina_prize_participates(be.id) or be.id = v_card.chosen_benefit_id
    ) x;
  else
    v_stamps := least(greatest(v_total - v_cards * v_goal, 0), v_goal);
  end if;

  -- "Dónde y cuándo canjeaste": los sellos de la tarjeta en curso (o de la última completada, si todavía está abierta).
  select coalesce(jsonb_agg(jsonb_build_object('business_name', h.bname, 'at', h.ts) order by h.ts), '[]'::jsonb) into v_history from (
    select coalesce(r.confirmed_at, r.created_at) as ts, b.name as bname
    from redemptions r join businesses b on b.id = r.business_id
    where r.user_id = v_user and r.status = 'confirmed' and not r.loyalty_free
    order by coalesce(r.confirmed_at, r.created_at), r.id
    offset greatest(case when v_card.id is not null then (v_cards - 1) * v_goal else v_cards * v_goal end, 0)
    limit v_goal
  ) h;

  select coalesce(jsonb_agg(jsonb_build_object(
      'completed_at', c.completed_at, 'status', case when c.status = 'used' then 'used' else 'expired' end,
      'closed_at', coalesce(c.closed_at, c.expires_at), 'benefit_name', be.name, 'business_name', b.name,
      'logo_url', b.logo_url, 'category', b.category) order by c.seq desc), '[]'::jsonb) into v_past
  from loyalty_cards c
  left join benefits be on be.id = c.chosen_benefit_id
  left join businesses b on b.id = be.business_id
  where c.user_id = v_user and c.status in ('used', 'expired');

  return jsonb_build_object(
    'stamps', v_stamps, 'goal', v_goal,
    'completed_at', v_card.completed_at, 'expires_at', v_card.expires_at, 'chosen_benefit_id', v_card.chosen_benefit_id,
    'options', v_options, 'history', v_history, 'past', v_past);
end;
$f$;
revoke execute on function my_camina_card() from public, anon;
grant execute on function my_camina_card() to authenticated;

-- ---------- Elegir (o cambiar) el premio ----------
create or replace function choose_camina_prize(p_benefit_id uuid) returns jsonb
language plpgsql security definer set search_path = public
as $f$
declare
  v_user uuid := auth.uid();
  v_card loyalty_cards%rowtype;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform camina_sync_card(v_user);
  select * into v_card from loyalty_cards where user_id = v_user and status = 'open' for update;
  if not found then
    raise exception 'Todavía no tienes una tarjeta completa';
  end if;
  if exists (select 1 from redemptions r where r.loyalty_card_id = v_card.id and r.status in ('pending', 'confirmed')) then
    raise exception 'Ya estás canjeando el premio de esta tarjeta';
  end if;
  if not camina_prize_participates(p_benefit_id) then
    raise exception 'Ese premio no está disponible';
  end if;
  update loyalty_cards set chosen_benefit_id = p_benefit_id where id = v_card.id;
  return my_camina_card();
end;
$f$;
revoke execute on function choose_camina_prize(uuid) from public, anon;
grant execute on function choose_camina_prize(uuid) to authenticated;

-- ---------- Panel del comercio ----------
drop function if exists business_loyalty_overview(uuid);
create or replace function business_loyalty_overview(p_business_id uuid) returns jsonb
language plpgsql security definer set search_path = public
as $f$
declare
  v_plan business_plan;
  v_benefit uuid;
  v_benefit_name text;
  v_waiting jsonb;
  v_month integer;
  v_total integer;
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;
  select b.plan, b.loyalty_benefit_id into v_plan, v_benefit from businesses b where b.id = p_business_id;
  select name into v_benefit_name from benefits where id = v_benefit and business_id = p_business_id and active;

  if v_plan not in ('paso_firme', 'paso_adelante') then
    return jsonb_build_object('plan_ok', false, 'goal', loyalty_goal(), 'days', loyalty_card_days());
  end if;

  -- Personas que ya eligieron un premio de este local y todavía no lo canjearon (solo nombre de pila e inicial).
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'Cliente')
        || coalesce(' ' || nullif(upper(left(nullif(split_part(btrim(p.full_name), ' ', 2), ''), 1)), '') || '.', ''),
      'benefit_name', be.name, 'expires_at', c.expires_at) order by c.expires_at), '[]'::jsonb) into v_waiting
  from loyalty_cards c
  join benefits be on be.id = c.chosen_benefit_id and be.business_id = p_business_id
  left join profiles p on p.id = c.user_id
  where c.status = 'open' and c.expires_at > now();

  select count(*) filter (where confirmed_at >= date_trunc('month', now() at time zone 'America/La_Paz') at time zone 'America/La_Paz'),
         count(*)
    into v_month, v_total
  from redemptions where business_id = p_business_id and loyalty_free and status = 'confirmed';

  return jsonb_build_object('plan_ok', true, 'goal', loyalty_goal(), 'days', loyalty_card_days(),
    'benefit_id', v_benefit, 'benefit_name', v_benefit_name,
    'waiting', v_waiting, 'delivered_month', v_month, 'delivered_total', v_total);
end;
$f$;
revoke execute on function business_loyalty_overview(uuid) from public, anon;
grant execute on function business_loyalty_overview(uuid) to authenticated;

-- ---------- Avisos de vencimiento (7 y 2 días antes) ----------
create or replace function queue_camina_card_notifications() returns void
language plpgsql security definer set search_path = public
as $f$
begin
  update loyalty_cards set status = 'expired', closed_at = expires_at where status = 'open' and expires_at <= now();

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select c.user_id,
         case when d.days <= 2 then '¡Tu premio vence en ' || d.days || case when d.days = 1 then ' día!' else ' días!' end
              else 'Tu premio vence en ' || d.days || ' días' end,
         case when be.id is null then 'Elige tu premio gratis antes de que venza tu tarjeta de fidelidad.'
              else 'Canjea ' || be.name || ' en ' || coalesce(b.name, 'el local') || ' antes de que venza.' end,
         jsonb_build_object('type', 'camina_card_expiring', 'card_id', c.id),
         'camina_card_' || case when d.days <= 2 then '2' else '7' end || ':' || c.id
  from loyalty_cards c
  cross join lateral (select greatest(ceil(extract(epoch from (c.expires_at - now())) / 86400)::int, 0) as days) d
  left join benefits be on be.id = c.chosen_benefit_id
  left join businesses b on b.id = be.business_id
  where c.status = 'open' and c.expires_at > now() and d.days between 1 and 7
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$f$;
revoke execute on function queue_camina_card_notifications() from public, anon, authenticated;
grant execute on function queue_camina_card_notifications() to service_role;

do $f$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'queue-camina-card-notifications';
    -- todos los días 13:00 UTC (09:00 en La Paz)
    perform cron.schedule('queue-camina-card-notifications', '0 13 * * *', 'select queue_camina_card_notifications()');
  end if;
end $f$;

-- ---------- Canje y confirmación con la regla de la tarjeta general ----------
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
  v_code text;
  v_ttl interval;
  v_tries integer := 0;
  v_pool boolean;
  v_coupon benefit_codes%rowtype;
  v_card loyalty_cards%rowtype;
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

  -- Tarjeta de fidelidad general: si la persona tiene una tarjeta completa, vigente, con ESTE premio elegido y todavía sin
  -- canje gratis (pendiente o confirmado), el canje sale gratis (0 Puntos). Camina no paga: el comercio puso el premio.
  perform camina_sync_card(v_user);
  select * into v_card from loyalty_cards c
  where c.user_id = v_user and c.status = 'open' and c.expires_at > v_now and c.chosen_benefit_id = p_benefit_id
    and not exists (select 1 from redemptions r where r.loyalty_card_id = c.id and r.status in ('pending', 'confirmed'));
  v_free := found;

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
    if v_cooldown_until is not null and not v_free then
      raise exception 'Ya canjeaste en este comercio hace menos de % días', business_redemption_cooldown_days();
    end if;

    if v_benefit.online then
      -- Premio online: los cupos son totales (no por día). Con cupones propios de la tienda (canal web) los cupos son los cupones cargados.
      if v_benefit.online_channel <> 'web' and v_benefit.online_quota is not null and (select count(*) from redemptions
          where benefit_id = p_benefit_id
            and status in ('pending', 'confirmed')) >= v_benefit.online_quota then
        raise exception 'Se agotaron los cupones de este premio';
      end if;
    elsif v_benefit.daily_quota is not null and (select count(*) from redemptions
        where benefit_id = p_benefit_id
          and status in ('pending', 'confirmed')
          and (created_at at time zone 'America/La_Paz')::date = local_today()) >= v_benefit.daily_quota then
      raise exception 'Se agotaron los cupones de hoy para este beneficio';
    end if;
  end if;

  v_cost := case when v_free then 0 else v_benefit.cost_points end;

  v_balance := user_points_balance(v_user) - user_points_reserved(v_user);
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente';
  end if;

  -- Los Puntos NO se descuentan acá: se reservan mientras el código está vigente y se descuentan cuando el local lo confirma.

  v_pool := v_benefit.online and v_benefit.online_channel = 'web';

  if v_pool then
    -- Cupón propio de la tienda (lo pega en su página al pagar): se entrega uno por canje y los Puntos se descuentan ya,
    -- porque la tienda no tiene cómo confirmar un cupón que se usa en su web.
    select * into v_coupon from benefit_codes
    where benefit_id = p_benefit_id and redemption_id is null
    order by created_at, id
    limit 1
    for update skip locked;
    if not found then
      raise exception 'Se agotaron los cupones de este premio';
    end if;

    insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, loyalty_card_id, code, code_expires_at, status, confirmed_at)
    values (v_user, p_benefit_id, v_benefit.business_id, v_cost, true, v_free, v_card.id, v_coupon.code,
            v_now + (online_code_ttl_days() || ' days')::interval, 'confirmed', v_now)
    returning * into v_row;

    update benefit_codes set redemption_id = v_row.id where id = v_coupon.id;
    if v_free then
      update loyalty_cards set status = 'used', closed_at = v_now, used_redemption_id = v_row.id where id = v_card.id;
    end if;

    if v_cost > 0 then
      insert into points_ledger (user_id, amount, reason, note)
      values (v_user, -v_cost, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
    end if;

    return v_row;
  end if;

  -- Premio online con código propio de Camina: vale 7 días (el pago por WhatsApp o redes puede tardar) y es único entre los pendientes del local.
  v_ttl := case when v_benefit.online then (online_code_ttl_days() || ' days')::interval
                else (redemption_code_ttl_minutes() || ' minutes')::interval end;
  loop
    v_code := generate_redemption_code();
    exit when not exists (
      select 1 from redemptions where business_id = v_benefit.business_id and code = v_code and status = 'pending'
    ) or v_tries >= 20;
    v_tries := v_tries + 1;
  end loop;

  insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, loyalty_card_id, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_cost, false, v_free, v_card.id,
    v_code, v_now + v_ttl
  )
  returning * into v_row;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

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

  -- Tarjeta general: el canje gratis cierra la tarjeta; cualquier otro canje confirmado puede completar una tarjeta nueva.
  if v_row.loyalty_card_id is not null then
    update loyalty_cards set status = 'used', closed_at = v_row.confirmed_at, used_redemption_id = v_row.id
    where id = v_row.loyalty_card_id and status = 'open';
  end if;
  if not v_row.loyalty_free then
    perform camina_sync_card(v_row.user_id);
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    select c.user_id, '¡Completaste tu tarjeta de fidelidad! 🎁',
           'Elige tu premio gratis. Tienes ' || loyalty_card_days() || ' días para canjearlo.',
           jsonb_build_object('type', 'camina_card_ready', 'card_id', c.id),
           'camina_card_ready:' || c.id
    from loyalty_cards c
    where c.user_id = v_row.user_id and c.completed_at = v_row.confirmed_at and c.status = 'open'
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;
revoke execute on function finish_redemption(uuid, uuid, text, integer) from public, anon, authenticated;


-- ---------- Se quita la tarjeta por local ----------
drop function if exists my_loyalty_cards(uuid);
drop function if exists loyalty_stamps(uuid, uuid);
drop function if exists loyalty_enabled(uuid);
