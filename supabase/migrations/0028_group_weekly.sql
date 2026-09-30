-- Cierre semanal de grupos: guarda el resultado de cada semana y borra los mensajes ------------

create table if not exists group_weekly_results (
  group_id uuid not null references groups (id) on delete cascade,
  week_start date not null,
  user_id uuid not null references profiles (id) on delete cascade,
  steps integer not null,
  goal_days integer not null,
  rank integer not null,
  primary key (group_id, week_start, user_id)
);
alter table group_weekly_results enable row level security;
create policy "weekly: members read" on group_weekly_results for select to authenticated
  using (exists (select 1 from group_members m where m.group_id = group_weekly_results.group_id and m.user_id = auth.uid()));
-- Solo se escribe con close_group_week().

-- Calcula el ranking de la semana (lunes a domingo, hora de La Paz) de todos los grupos y avisa a los miembros.
create or replace function close_group_week(p_week_start date) returns integer as $$
declare
  v_count integer := 0;
begin
  insert into group_weekly_results (group_id, week_start, user_id, steps, goal_days, rank)
  select group_id, p_week_start, user_id, steps, goal_days,
         rank() over (partition by group_id order by steps desc, goal_days desc)::int
  from (
    select m.group_id, m.user_id,
           coalesce(sum(s.steps), 0)::int as steps,
           coalesce(count(*) filter (where s.steps >= p.daily_goal), 0)::int as goal_days
    from group_members m
    join profiles p on p.id = m.user_id
    left join steps_daily s on s.user_id = m.user_id and s.day >= p_week_start and s.day < p_week_start + 7
    where m.joined_at < (p_week_start + 7)::timestamp
    group by m.group_id, m.user_id
  ) t
  on conflict do nothing;
  get diagnostics v_count = row_count;

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select r.user_id,
         'Terminó la semana en ' || g.name || ' 🏁',
         case when r.rank = 1 then '¡Ganaste la semana con ' || r.steps || ' pasos!'
              else 'Quedaste #' || r.rank || ' con ' || r.steps || ' pasos. Ganó ' || w.full_name || '.' end,
         jsonb_build_object('type', 'group_week', 'group_id', r.group_id),
         'gweek:' || r.group_id || ':' || p_week_start || ':' || r.user_id
  from group_weekly_results r
  join groups g on g.id = r.group_id
  join group_weekly_results top on top.group_id = r.group_id and top.week_start = r.week_start and top.rank = 1
  join profiles w on w.id = top.user_id
  where r.week_start = p_week_start and r.steps > 0
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

-- Todos los lunes: se guarda la semana que terminó y se vacían los chats de grupo.
create or replace function weekly_group_maintenance() returns void as $$
declare
  v_week date := date_trunc('week', now() at time zone 'America/La_Paz')::date - 7;
begin
  perform close_group_week(v_week);
  delete from group_notes;
end;
$$ language plpgsql security definer set search_path = public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('purge-old-group-notes', 'weekly-group-maintenance');
    -- lunes 04:05 UTC = lunes 00:05 en La Paz
    perform cron.schedule('weekly-group-maintenance', '5 4 * * 1', 'select weekly_group_maintenance()');
  end if;
end $$;
