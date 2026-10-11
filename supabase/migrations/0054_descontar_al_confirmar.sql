-- 0054 — Los Puntos de un canje se descuentan cuando el LOCAL confirma el código (no al generarlo)
--
-- Antes: al tocar "Canjear" se descontaban los Puntos al instante; si el código vencía se devolvían.
-- Ahora: al tocar "Canjear" los Puntos quedan RESERVADOS mientras el código esté vigente (más 1 hora de gracia) y se
--   descuentan recién cuando el comercio confirma el código. Si el código vence o se cancela, no hay nada que devolver.
-- - redemptions.points_charged: true = los Puntos ya se descontaron (canjes viejos, siguen devolviéndose como siempre);
--   false = todavía no (canjes nuevos). Los canjes pendientes que ya existen quedan como estaban (true).
-- - user_points_reserved(): suma de los canjes nuevos pendientes. redeem_benefit y las puestas de los desafíos de grupo
--   miran saldo - reservado, así nadie gasta dos veces los mismos Puntos.
-- - confirm_redemption_code descuenta (movimiento "Canje en <local>") al confirmar.
-- - regenerate_redemption_code no revive un código sin cobrar que venció hace más de 1 hora (hay que canjear de nuevo).
-- Idempotente: sí. Se revierte volviendo a aplicar redeem_benefit/confirm/cancel/expire de las migraciones 0045, 0026, 0033 y 0052.

alter table redemptions add column if not exists points_charged boolean not null default true;
alter table redemptions alter column points_charged set default false;

create or replace function user_points_reserved(p_user_id uuid) returns integer as $$
  select coalesce(sum(cost_points), 0)::integer
  from redemptions
  where user_id = p_user_id and status = 'pending' and not points_charged
    and code_expires_at > now() - interval '1 hour';
$$ language sql stable security definer set search_path = public;
revoke execute on function user_points_reserved(uuid) from public, anon, authenticated;
grant execute on function user_points_reserved(uuid) to service_role;

create or replace function redeem_benefit(p_benefit_id uuid) returns redemptions as $$
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

  v_balance := user_points_balance(v_user) - user_points_reserved(v_user);
  if v_balance < v_benefit.cost_points then
    raise exception 'Saldo insuficiente';
  end if;

  -- Los Puntos NO se descuentan acá: se reservan mientras el código está vigente y se descuentan cuando el local lo confirma.

  insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_benefit.cost_points, false,
    generate_redemption_code(), v_now + (redemption_code_ttl_minutes() || ' minutes')::interval
  )
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_group_challenge(
  p_group uuid, p_name text, p_rule text, p_daily_goal integer, p_start date, p_end date, p_stake integer
) returns uuid as $$
declare
  v_id uuid;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_gname text;
begin
  if auth.uid() is null or not exists (select 1 from group_members where group_id = p_group and user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  -- Un solo gasto de Puntos a la vez por persona (mismo candado que redeem_benefit, SEC-06).
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not text_is_clean(p_name) then
    raise exception 'El nombre tiene palabras no permitidas.';
  end if;
  if p_start < v_today then
    raise exception 'La fecha de inicio ya pasó.';
  end if;
  if exists (select 1 from group_challenges where group_id = p_group and status = 'active') then
    raise exception 'Este grupo ya tiene un desafío en marcha. Esperá a que termine.';
  end if;
  if p_stake > 0 and user_points_balance(auth.uid()) - user_points_reserved(auth.uid()) < p_stake then
    raise exception 'No te alcanzan los puntos para poner % en juego.', p_stake;
  end if;

  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (p_group, auth.uid(), btrim(p_name), p_rule, p_daily_goal, p_start, p_end, p_stake)
  returning id into v_id;

  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (v_id, auth.uid(), p_stake);
  if p_stake > 0 then
    insert into points_ledger (user_id, amount, reason, note) values (auth.uid(), -p_stake, 'challenge', 'Pusiste en «' || btrim(p_name) || '»');
  end if;

  select name into v_gname from groups where id = p_group;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select m.user_id, 'Nuevo desafío en ' || v_gname || ' 🏆',
         '"' || btrim(p_name) || '" ya empezó a armarse. Entrá y sumate.',
         jsonb_build_object('type', 'group_challenge', 'group_id', p_group), 'gch:' || v_id || ':' || m.user_id
  from group_members m where m.group_id = p_group and m.user_id <> auth.uid()
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function join_group_challenge(p_challenge uuid) returns void as $$
declare
  c group_challenges;
  v_today date := (now() at time zone 'America/La_Paz')::date;
begin
  select * into c from group_challenges where id = p_challenge and status = 'active';
  if c.id is null then
    raise exception 'Este desafío ya terminó.';
  end if;
  if auth.uid() is null or not exists (select 1 from group_members where group_id = c.group_id and user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  -- Un solo gasto de Puntos a la vez por persona (mismo candado que redeem_benefit, SEC-06).
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if v_today > c.start_day then
    raise exception 'Ya no se puede sumar: el desafío empezó.';
  end if;
  if exists (select 1 from group_challenge_entries where challenge_id = p_challenge and user_id = auth.uid()) then
    return;
  end if;
  if c.stake > 0 and user_points_balance(auth.uid()) - user_points_reserved(auth.uid()) < c.stake then
    raise exception 'No te alcanzan los puntos (necesitás %).', c.stake;
  end if;
  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (p_challenge, auth.uid(), c.stake);
  if c.stake > 0 then
    insert into points_ledger (user_id, amount, reason, note) values (auth.uid(), -c.stake, 'challenge', 'Pusiste en «' || c.name || '»');
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- confirm_redemption_code: descuenta al confirmar ----------
create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $$
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

  -- Los canjes viejos ya descontaron al generar el código; los nuevos se descuentan recién acá.
  if not v_was_charged then
    select name into v_bname from businesses where id = v_row.business_id;
    insert into points_ledger (user_id, amount, reason, note)
    values (v_row.user_id, -v_row.cost_points, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
  end if;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- cancel_expired_redemption: devuelve solo si ya se habían descontado ----------
create or replace function cancel_expired_redemption(p_redemption_id uuid) returns redemptions as $$
declare
  v_row redemptions%rowtype;
  v_bname text;
begin
  select * into v_row from redemptions
  where id = p_redemption_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Canje no encontrado';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Este canje ya no está pendiente';
  end if;
  if v_row.code_expires_at > now() then
    raise exception 'Este código todavía no venció';
  end if;

  update redemptions set status = 'cancelled' where id = v_row.id returning * into v_row;

  if v_row.points_charged then
    select name into v_bname from businesses where id = v_row.business_id;
    insert into points_ledger (user_id, amount, reason, note)
    values (v_row.user_id, v_row.cost_points, 'redemption', 'Te devolvimos los puntos: venció el código de ' || coalesce(v_bname, 'tu canje'));
  end if;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- regenerate_redemption_code: no revive un código sin cobrar que ya soltó la reserva ----------
create or replace function regenerate_redemption_code(p_redemption_id uuid) returns redemptions as $$
declare
  v_row redemptions;
begin
  update redemptions
  set code = generate_redemption_code(),
      code_expires_at = now() + (redemption_code_ttl_minutes() || ' minutes')::interval
  where id = p_redemption_id and user_id = auth.uid() and status = 'pending'
    and (points_charged or code_expires_at > now() - interval '1 hour')
  returning * into v_row;

  if not found then
    raise exception 'No se puede regenerar este código. Canjeá de nuevo.';
  end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- expire_pending_redemptions: devuelve solo lo que ya se había descontado ----------
create or replace function public.expire_pending_redemptions(p_grace interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r redemptions;
  v_bname text;
  v_done integer := 0;
begin
  for r in
    select * from redemptions
    where status = 'pending'
      and code_expires_at < now() - greatest(coalesce(p_grace, interval '1 hour'), interval '0')
    order by code_expires_at
    limit 1000
    for update skip locked
  loop
    update redemptions set status = 'cancelled' where id = r.id and status = 'pending';
    if found then
      if r.points_charged then
        select name into v_bname from businesses where id = r.business_id;
        insert into points_ledger (user_id, amount, reason, note)
        values (r.user_id, r.cost_points, 'redemption',
                'Te devolvimos los puntos: venció el código de ' || coalesce(v_bname, 'tu canje'));
      end if;
      v_done := v_done + 1;
    end if;
  end loop;
  return v_done;
end;
$$;
revoke execute on function public.expire_pending_redemptions(interval) from public, anon, authenticated;
grant execute on function public.expire_pending_redemptions(interval) to service_role;
