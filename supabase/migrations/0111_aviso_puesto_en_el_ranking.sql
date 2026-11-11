-- 0111: aviso de mitad de semana con tu puesto en el ranking global y cuánto falta para subir uno.
-- Jueves 18:00 de Bolivia, a quien caminó esta semana y aparece en el ranking. Uno por persona por semana.
-- Solo encola avisos; no cambia Puntos ni reglas. Se revierte con cron.unschedule('queue-ranking-nudge').
create or replace function queue_ranking_nudge_notifications() returns void
language sql security definer set search_path = public
as $f$
  with w as (select date_trunc('week', (now() at time zone 'America/La_Paz')::date)::date as d0),
  tot as (
    select s.user_id, sum(s.steps)::bigint as steps
    from steps_daily s
    join profiles p on p.id = s.user_id
    cross join w
    where s.day >= w.d0 and coalesce(p.ranking_visible, true)
    group by s.user_id having sum(s.steps) > 0
  ),
  ranked as (
    select user_id, steps, rank() over (order by steps desc) as pos, count(*) over () as n,
           lag(steps) over (order by steps desc) as ahead, lead(steps) over (order by steps desc) as behind
    from tot
  )
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select r.user_id,
         case when r.pos = 1 then '¡Vas primero en el ranking!' else 'Vas #' || r.pos || ' en el ranking global' end,
         case when r.pos = 1 and r.behind is not null then 'Le llevas ' || replace(to_char(r.steps - r.behind, 'FM999,999,999'), ',', '.') || ' pasos al segundo. Sigue así hasta el domingo.'
              when r.pos = 1 then 'Sigue así hasta el domingo.'
              when r.ahead > r.steps then 'Te faltan ' || replace(to_char(r.ahead - r.steps + 1, 'FM999,999,999'), ',', '.') || ' pasos para subir al #' || (r.pos - 1) || '. '
                   || case when r.ahead - r.steps <= 3000 then 'Una caminata y lo pasas.' else 'Tienes hasta el domingo.' end
              else 'Estás empatado. Un paso más y subes de puesto.' end,
         jsonb_build_object('type', 'weekly_rank'),
         'rank_nudge:' || (select d0 from w) || ':' || r.user_id
  from ranked r
  where r.n > 1
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$f$;
revoke execute on function queue_ranking_nudge_notifications() from public, anon, authenticated;
grant execute on function queue_ranking_nudge_notifications() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'queue-ranking-nudge';
    perform cron.schedule('queue-ranking-nudge', '0 22 * * 4', 'select queue_ranking_nudge_notifications()');
  end if;
end $$;
