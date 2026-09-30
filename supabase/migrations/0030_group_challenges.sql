-- Desafíos de grupo: los miembros ponen puntos propios y los reparten quienes cumplen la meta ----------

create table if not exists group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  created_by uuid not null references profiles (id),
  name text not null check (char_length(name) between 3 and 30),
  rule text not null check (rule in ('steps', 'days', 'streak')),
  daily_goal integer not null check (daily_goal between 1000 and 60000),
  start_day date not null,
  end_day date not null,
  stake integer not null default 0 check (stake between 0 and 50),
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  check (end_day >= start_day and end_day - start_day <= 13)
);
alter table group_challenges enable row level security;
create policy "challenges: members read" on group_challenges for select to authenticated
  using (exists (select 1 from group_members m where m.group_id = group_challenges.group_id and m.user_id = auth.uid()));

create table if not exists group_challenge_entries (
  challenge_id uuid not null references group_challenges (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  stake_paid integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table group_challenge_entries enable row level security;
create policy "entries: members read" on group_challenge_entries for select to authenticated
  using (exists (
    select 1 from group_challenges c join group_members m on m.group_id = c.group_id
    where c.id = group_challenge_entries.challenge_id and m.user_id = auth.uid()
  ));

create table if not exists group_challenge_results (
  challenge_id uuid not null references group_challenges (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  steps integer not null,
  goal_days integer not null,
  best_streak integer not null,
  met_goal boolean not null,
  rank integer not null,
  payout integer not null default 0,
  primary key (challenge_id, user_id)
);
alter table group_challenge_results enable row level security;
create policy "results: members read" on group_challenge_results for select to authenticated
  using (exists (
    select 1 from group_challenges c join group_members m on m.group_id = c.group_id
    where c.id = group_challenge_results.challenge_id and m.user_id = auth.uid()
  ));

-- Crea el desafío (solo quien está en el grupo, uno activo a la vez) y anota a quien lo crea.
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
    insert into points_ledger (user_id, amount, reason) values (auth.uid(), -p_stake, 'challenge');
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
grant execute on function create_group_challenge(uuid, text, text, integer, date, date, integer) to authenticated;

-- Sumarse: se descuentan los puntos en juego (solo hasta el final del primer día).
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
    insert into points_ledger (user_id, amount, reason) values (auth.uid(), -c.stake, 'challenge');
  end if;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function join_group_challenge(uuid) to authenticated;

-- Avance en vivo (o final) de cada participante.
create or replace function challenge_progress(p_challenge uuid)
returns table (user_id uuid, steps integer, goal_days integer, best_streak integer, met_goal boolean) as $$
declare
  c group_challenges;
  v_total_days integer;
  v_min_days integer;
begin
  select * into c from group_challenges where id = p_challenge;
  if c.id is null or not exists (select 1 from group_members where group_id = c.group_id and user_id = auth.uid()) then
    return;
  end if;
  v_total_days := c.end_day - c.start_day + 1;
  v_min_days := ceil(v_total_days * 0.8)::int;
  return query
  with days as (
    select e.user_id as uid, d::date as day,
           coalesce((select s.steps from steps_daily s where s.user_id = e.user_id and s.day = d::date), 0) as steps
    from group_challenge_entries e, generate_series(c.start_day, c.end_day, interval '1 day') d
    where e.challenge_id = p_challenge
  ), flagged as (
    select uid, day, steps, (steps >= c.daily_goal) as ok,
           day - (row_number() over (partition by uid, (steps >= c.daily_goal) order by day))::int as grp
    from days
  ), streaks as (
    select uid, count(*)::int as len from flagged where ok group by uid, grp
  )
  select f.uid, sum(f.steps)::int, count(*) filter (where f.ok)::int,
         coalesce((select max(len) from streaks s where s.uid = f.uid), 0),
         count(*) filter (where f.ok) >= v_min_days
  from flagged f group by f.uid;
end;
$$ language plpgsql stable security definer set search_path = public;
grant execute on function challenge_progress(uuid) to authenticated;

-- Cierra los desafíos terminados: guarda resultados y reparte el pozo entre quienes cumplieron.
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
      insert into points_ledger (user_id, amount, reason, expires_at)
      select user_id, payout, 'challenge', now() + v_ttl from group_challenge_results where challenge_id = c.id and payout > 0;
    else
      insert into points_ledger (user_id, amount, reason, expires_at)
      select user_id, stake_paid, 'challenge', now() + v_ttl from group_challenge_entries where challenge_id = c.id and stake_paid > 0;
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

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'settle-group-challenges';
    -- todos los días 04:10 UTC = 00:10 en La Paz
    perform cron.schedule('settle-group-challenges', '10 4 * * *', 'select settle_group_challenges()');
  end if;
end $$;
