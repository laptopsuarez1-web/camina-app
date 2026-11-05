-- Desafío con pozo: el primero en terminar se lleva la mitad del pozo; el resto se reparte entre los demás que terminan;
-- si termina uno solo, se lleva todo; si nadie termina, cada uno recupera lo que puso (esto último ya era así).
-- "Terminar" = cumplir la meta diaria en al menos el 80% de los días del desafío; se guarda el día en que lo logró
-- (finish_day) y el orden de llegada (finish_pos).

alter table group_challenge_results add column if not exists finish_day date;
alter table group_challenge_results add column if not exists finish_pos integer;

create or replace function settle_group_challenges() returns integer as $$
declare
  c group_challenges;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_pot integer;
  v_winners integer;
  v_share integer;
  v_half integer;
  v_min integer;
  v_done integer := 0;
  v_gname text;
  v_ttl interval := (points_ttl_days() || ' days')::interval;
begin
  for c in select * from group_challenges where status = 'active' and end_day < v_today for update loop
    -- resultados con el mismo cálculo del avance (sin depender de auth.uid())
    create temp table if not exists _ch_res (uid uuid, steps int, goal_days int, best_streak int, met boolean, rnk int, fin date, pos int) on commit drop;
    delete from _ch_res;
    v_min := ceil(((c.end_day - c.start_day + 1) * 0.8))::int;
    insert into _ch_res (uid, steps, goal_days, best_streak, met, fin)
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
           (count(*) filter (where f.ok)) >= v_min,
           -- día en que completó la cantidad de días con meta que pide el desafío (cuándo "terminó")
           (select x.day from (select f2.day, row_number() over (order by f2.day) as n from flagged f2 where f2.uid = f.uid and f2.ok) x where x.n = v_min)
    from flagged f group by f.uid;

    update _ch_res r set rnk = t.rn from (
      select uid, row_number() over (
        order by case c.rule when 'steps' then steps when 'days' then goal_days else best_streak end desc, steps desc
      ) as rn from _ch_res
    ) t where t.uid = r.uid;

    -- Orden de llegada entre quienes cumplen: quien completó antes; si empatan, quien quedó mejor en la regla.
    update _ch_res r set pos = t.p from (
      select uid, row_number() over (order by fin, rnk) as p from _ch_res where met
    ) t where t.uid = r.uid;

    select coalesce(sum(stake_paid), 0) into v_pot from group_challenge_entries where challenge_id = c.id;
    select count(*) into v_winners from _ch_res where met;
    -- El pozo: el primero en terminar se lleva la mitad; el resto se reparte entre los demás que terminan.
    -- Si termina uno solo, se lleva todo. La mitad se redondea hacia arriba y el sobrante del resto va al segundo.
    v_half := v_pot - v_pot / 2;
    v_share := case when v_winners > 1 then (v_pot - v_half) / (v_winners - 1) else 0 end;

    insert into group_challenge_results (challenge_id, user_id, steps, goal_days, best_streak, met_goal, rank, payout, finish_day, finish_pos)
    select c.id, r.uid, r.steps, r.goal_days, r.best_streak, r.met, r.rnk,
           case when not r.met then 0
                when v_winners = 1 then v_pot
                when r.pos = 1 then v_half
                when r.pos = 2 then v_share + ((v_pot - v_half) - v_share * (v_winners - 1))
                else v_share end,
           r.fin, r.pos
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
           case when res.finish_pos = 1 and res.payout > 0 then '¡Llegaste primero! Ganaste ' || res.payout || ' puntos en ' || v_gname || '.'
                when res.payout > 0 then '¡Ganaste ' || res.payout || ' puntos! Quedaste #' || res.rank || ' en ' || v_gname || '.'
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
