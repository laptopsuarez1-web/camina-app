-- Movimientos de puntos con detalle, saldo con vencimientos bien calculado y "puntos por vencer" real ----------

-- Detalle legible de cada movimiento ("Ana se sumó", "Canje en Bloom", "Pusiste en «Gym bro»"...).
alter table points_ledger add column if not exists note text;

-- Saldo: los puntos que se gastan consumen primero los que vencen antes (FIFO). Antes se restaban
-- todos los gastos aunque los puntos gastados ya hubieran vencido, y el saldo podía quedar negativo.
create or replace function user_points_balance(p_user_id uuid) returns integer as $$
  with agg as (
    select
      coalesce(sum(amount) filter (where amount > 0 and (expires_at is null or expires_at > now())), 0) as u,
      coalesce(sum(amount) filter (where amount > 0 and expires_at is not null and expires_at <= now()), 0) as e,
      coalesce(-sum(amount) filter (where amount < 0), 0) as s
    from points_ledger where user_id = p_user_id
  )
  select greatest(0, u - greatest(0, s - e))::integer from agg;
$$ language sql stable;

-- Puntos que de verdad se van a perder pronto (ya descontando lo que gastaste) y en cuántos días.
create or replace function points_expiring_soon(p_within_days integer default 14)
returns table (amount integer, days integer) as $$
  with spent as (
    select coalesce(-sum(l.amount), 0) as s from points_ledger l where l.user_id = auth.uid() and l.amount < 0
  ), pos as (
    select l.amount, l.expires_at,
           sum(l.amount) over (order by l.expires_at nulls last, l.earned_at, l.id) as run
    from points_ledger l where l.user_id = auth.uid() and l.amount > 0
  ), rem as (
    select p.expires_at, greatest(0, least(p.amount, p.run - sp.s)) as r from pos p cross join spent sp
  )
  select coalesce(sum(r), 0)::integer,
         coalesce(greatest(0, ceil(extract(epoch from (min(expires_at) - now())) / 86400)), 0)::integer
  from rem
  where r > 0 and expires_at > now() and expires_at <= now() + (p_within_days || ' days')::interval;
$$ language sql stable security definer set search_path = public;
grant execute on function points_expiring_soon(integer) to authenticated;

-- Referido: "Ana se sumó".
create or replace function credit_referral_on_first_points() returns trigger as $$
declare
  v_ref referrals%rowtype;
  v_name text;
begin
  if new.reason = 'steps' then
    select * into v_ref from referrals
      where referred_user_id = new.user_id and credited = false;
    if found then
      select nullif(split_part(btrim(coalesce(full_name, '')), ' ', 1), '') into v_name from profiles where id = v_ref.referred_user_id;
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      values (v_ref.referrer_user_id, 5, 'referral', now() + (points_ttl_days() || ' days')::interval, coalesce(v_name, 'Un amigo') || ' se sumó');
      update referrals set credited = true where id = v_ref.id;
      perform queue_notification(
        v_ref.referrer_user_id,
        '¡Ganaste 5 Puntos!',
        coalesce(v_name, 'Tu referido') || ' empezó a caminar con Camina. Gracias por invitarlo 🎉',
        jsonb_build_object('type', 'referral_credited'),
        null
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Reto: "Reto: nombre".
create or replace function claim_reto(p_reto_id uuid) returns integer as $$
declare
  r retos;
  v_met integer;
  v_claims integer;
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from retos where id = p_reto_id and active for update;
  if r.id is null then
    raise exception 'Ese reto no está disponible.';
  end if;
  v_met := _reto_met(r, auth.uid());
  select count(*) into v_claims from reto_claims where reto_id = r.id and user_id = auth.uid();

  if r.kind = 'referrals' then
    if v_met < (v_claims + 1) * r.target then
      raise exception 'Todavía te faltan amigos para este reto.';
    end if;
  else
    if v_met < r.target then
      raise exception 'Todavía no completaste este reto.';
    end if;
    if r.kind = 'steps_streak' and exists (
      select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid()
        and c.claimed_at > now() - (r.target || ' days')::interval
    ) then
      raise exception 'Ya cobraste este reto. Podés volver a completarlo más adelante.';
    end if;
  end if;

  v_period := _reto_period(r, auth.uid(), v_met);
  insert into reto_claims (reto_id, user_id, period, points) values (r.id, auth.uid(), v_period, r.reward_points)
  on conflict (reto_id, user_id, period) do nothing;
  if not found then
    raise exception 'Ya cobraste este reto.';
  end if;

  insert into points_ledger (user_id, amount, reason, expires_at, note)
  values (auth.uid(), r.reward_points, 'challenge', now() + (points_ttl_days() || ' days')::interval, 'Reto: ' || r.title);

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  values (auth.uid(), '¡Reto cumplido! 🎉', 'Ganaste ' || r.reward_points || ' Puntos por "' || r.title || '".',
          jsonb_build_object('type', 'reto', 'reto_id', r.id), 'reto:' || r.id || ':' || auth.uid() || ':' || v_period)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return r.reward_points;
end;
$$ language plpgsql security definer set search_path = public;

-- Canje: "Canje en Bloom" y devolución si el código vence.
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
  select name into v_bname from businesses where id = v_row.business_id;

  insert into points_ledger (user_id, amount, reason, note)
  values (v_row.user_id, v_row.cost_points, 'redemption', 'Te devolvimos los puntos: venció el código de ' || coalesce(v_bname, 'tu canje'));

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- Desafíos de grupo (puntos en juego, premio y devolución con detalle).
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

create or replace function settle_group_challenges() returns integer as $$
declare
  c group_challenges;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_pot integer;
  v_winners integer;
  v_share integer;
  v_done integer := 0;
  v_gname text;
  v_ttl interval := (points_ttl_days() || ' days')::interval;
begin
  for c in select * from group_challenges where status = 'active' and end_day < v_today for update loop
    -- resultados con el mismo cálculo del avance (sin depender de auth.uid())
    create temp table if not exists _ch_res (uid uuid, steps int, goal_days int, best_streak int, met boolean, rnk int) on commit drop;
    delete from _ch_res;
    insert into _ch_res (uid, steps, goal_days, best_streak, met)
    with days as (
      select e.user_id as uid, d::date as day,
             coalesce((select s.steps from steps_daily s where s.user_id = e.user_id and s.day = d::date), 0) as steps
      from group_challenge_entries e, generate_series(c.start_day, c.end_day, interval '1 day') d
      where e.challenge_id = c.id
    ), flagged as (
      select uid, day, steps, (steps >= c.daily_goal) as ok,
             day - (row_number() over (partition by uid, (steps >= c.daily_goal) order by day))::int as grp
      from days
    ), streaks as (
      select uid, count(*)::int as len from flagged where ok group by uid, grp
    )
    select f.uid, sum(f.steps)::int, (count(*) filter (where f.ok))::int,
           coalesce((select max(len) from streaks s where s.uid = f.uid), 0),
           (count(*) filter (where f.ok)) >= ceil(((c.end_day - c.start_day + 1) * 0.8))::int
    from flagged f group by f.uid;

    update _ch_res r set rnk = t.rn from (
      select uid, row_number() over (
        order by case c.rule when 'steps' then steps when 'days' then goal_days else best_streak end desc, steps desc
      ) as rn from _ch_res
    ) t where t.uid = r.uid;

    select coalesce(sum(stake_paid), 0) into v_pot from group_challenge_entries where challenge_id = c.id;
    select count(*) into v_winners from _ch_res where met;
    v_share := case when v_winners > 0 then v_pot / v_winners else 0 end;

    insert into group_challenge_results (challenge_id, user_id, steps, goal_days, best_streak, met_goal, rank, payout)
    select c.id, r.uid, r.steps, r.goal_days, r.best_streak, r.met, r.rnk,
           case when r.met then v_share + (case when r.rnk = (select min(rnk) from _ch_res where met) then v_pot - v_share * v_winners else 0 end) else 0 end
    from _ch_res r;

    -- pagos: reparto entre quienes cumplen; si nadie cumple, cada uno recupera lo suyo
    if v_winners > 0 then
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      select user_id, payout, 'challenge', now() + v_ttl, 'Ganaste «' || c.name || '»' from group_challenge_results where challenge_id = c.id and payout > 0;
    else
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      select user_id, stake_paid, 'challenge', now() + v_ttl, 'Te devolvimos lo que pusiste en «' || c.name || '»' from group_challenge_entries where challenge_id = c.id and stake_paid > 0;
    end if;

    select name into v_gname from groups where id = c.group_id;
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    select res.user_id, 'Terminó "' || c.name || '" 🏁',
           case when res.payout > 0 then '¡Ganaste ' || res.payout || ' puntos! Quedaste #' || res.rank || ' en ' || v_gname || '.'
                when res.met_goal then 'Cumpliste la meta. Quedaste #' || res.rank || ' en ' || v_gname || '.'
                else 'Quedaste #' || res.rank || ' en ' || v_gname || '. ¡Vas por la próxima!' end,
           jsonb_build_object('type', 'group_challenge_end', 'group_id', c.group_id), 'gchend:' || c.id || ':' || res.user_id
    from group_challenge_results res where res.challenge_id = c.id
    on conflict (dedupe_key) where dedupe_key is not null do nothing;

    update group_challenges set status = 'finished', settled_at = now() where id = c.id;
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$$ language plpgsql security definer set search_path = public;
