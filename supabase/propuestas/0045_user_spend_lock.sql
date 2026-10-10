-- PROPUESTA 0045 — Candado por persona para que dos gastos de Puntos simultáneos no se pisen
--
-- Hallazgo: SEC-06 (medio).
-- Qué arregla: redeem_benefit solo bloquea la fila del beneficio. Dos llamadas simultáneas de la MISMA persona sobre beneficios
--   distintos leen el mismo saldo, pasan las dos y gastan más Puntos de los que tiene (el saldo se recorta a 0 con greatest(0, ...)
--   y nadie lo nota). Si los dos beneficios son del mismo comercio, también se saltean el cooldown de 14 días (los planes pagos
--   permiten varios beneficios por comercio). Pasa igual con las puestas de los desafíos de grupo (create_group_challenge y
--   join_group_challenge).
-- Qué hace: recrea las tres funciones (cuerpo idéntico al de la 0033) agregando UNA línea: un candado de transacción por persona,
--   pg_advisory_xact_lock(hashtextextended(<id de la persona>::text, 0)). Se toma ANTES de leer el saldo y de bloquear el
--   beneficio, así el orden de bloqueos es siempre "persona y después beneficio" y no hay riesgo de deadlock. Es el tipo _xact:
--   se suelta solo al terminar la transacción y funciona con el pooler de Supabase. La segunda llamada espera, y al
--   continuar ve el saldo y los canjes ya confirmados de la primera.
-- Impacto en el cliente: ninguno. Una persona que toca dos veces seguidas espera unos milisegundos; el segundo toque recibe el
--   mensaje normal ("Saldo insuficiente" / "Ya canjeaste en este comercio…"). Los permisos de las tres funciones no cambian
--   (create or replace conserva los grants de la 0034).
-- Fuera de alcance (anotado en el README): la regla "un solo desafío activo por grupo" la pueden saltear DOS personas distintas
--   creando a la vez; el candado por persona no la cubre, haría falta un candado por grupo.
-- Idempotente: sí (create or replace).
-- Cómo se revierte: volver a aplicar las tres funciones de supabase/migrations/0033_ledger_notes_fifo.sql (redeem_benefit,
--   create_group_challenge, join_group_challenge).

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

  v_balance := user_points_balance(v_user);
  if v_balance < v_benefit.cost_points then
    raise exception 'Saldo insuficiente';
  end if;

  insert into points_ledger (user_id, amount, reason, note)
  values (v_user, -v_benefit.cost_points, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));

  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_benefit.cost_points,
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
  if p_stake > 0 and user_points_balance(auth.uid()) < p_stake then
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
  if c.stake > 0 and user_points_balance(auth.uid()) < c.stake then
    raise exception 'No te alcanzan los puntos (necesitás %).', c.stake;
  end if;
  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (p_challenge, auth.uid(), c.stake);
  if c.stake > 0 then
    insert into points_ledger (user_id, amount, reason, note) values (auth.uid(), -c.stake, 'challenge', 'Pusiste en «' || c.name || '»');
  end if;
end;
$$ language plpgsql security definer set search_path = public;
