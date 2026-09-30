-- Corrección: los nombres de las columnas de salida chocaban con las de las tablas dentro de la función.
-- Avance en vivo (o final) de cada participante.
create or replace function challenge_progress(p_challenge uuid)
returns table (user_id uuid, steps integer, goal_days integer, best_streak integer, met_goal boolean) as $$
#variable_conflict use_column
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

