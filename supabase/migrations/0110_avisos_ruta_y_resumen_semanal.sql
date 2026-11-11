-- 0110: avisos nuevos y un texto corregido.
-- 1) Recordatorios de la Ruta del mes: a quien participa y todavía no la completó, el día 15, a 5 días del cierre y el último día.
-- 2) Resumen del lunes para quien no está en ningún grupo: sus pasos de la semana y su puesto en el ranking global.
--    (Quien está en un grupo ya recibe el resumen de su grupo, 0028.)
-- 3) El aviso de racha del servidor pasa a español neutro (decía "Llevás", "mantenés").
-- Nada de esto cambia Puntos ni reglas: solo encola avisos. Idempotente. Se revierte con cron.unschedule de los dos trabajos nuevos.

create or replace function queue_route_reminder_notifications() returns void
language plpgsql security definer set search_path = public
as $f$
declare
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_month date := date_trunc('month', v_today)::date;
  v_last date := (v_month + interval '1 month' - interval '1 day')::date;
  v_left int := v_last - v_today;
  v_kind text;
  v_name text := (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from v_today)::int];
begin
  v_kind := case when v_left = 0 then 'ultimo' when v_left = 5 then 'cinco' when extract(day from v_today) = 15 then 'mitad' else null end;
  if v_kind is null then return; end if;

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select rp.user_id,
         case v_kind when 'ultimo' then 'Hoy termina tu Ruta de ' || v_name
                     when 'cinco' then 'Quedan 5 días para tu Ruta'
                     else 'Tu Ruta de ' || v_name || ' sigue abierta' end,
         case v_kind when 'ultimo' then 'Última oportunidad: ' else '' end
           || case when p.pending = 1 then 'Te falta 1 local' else 'Te faltan ' || p.pending || ' locales' end
           || case v_kind when 'mitad' then ' y quedan ' || v_left || ' días.' else '.' end
           || ' Complétala y entra al sorteo.',
         jsonb_build_object('type', 'route_reminder', 'screen', 'ruta'),
         'route_reminder:' || v_kind || ':' || v_month || ':' || rp.user_id
  from route_participants rp
  cross join lateral (
    select greatest(0, (select count(*) from route_stops s where s.user_id = rp.user_id and s.month = rp.month)
                     - (select count(*) from route_visits v where v.user_id = rp.user_id and v.month = rp.month and v.status = 'confirmed'))::int as pending
  ) p
  where rp.month = v_month and rp.completed_at is null and p.pending > 0
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$f$;
revoke execute on function queue_route_reminder_notifications() from public, anon, authenticated;
grant execute on function queue_route_reminder_notifications() to service_role;

create or replace function queue_weekly_rank_notifications() returns void
language sql security definer set search_path = public
as $f$
  with w as (
    -- La semana que acaba de terminar (lunes a domingo, hora de Bolivia).
    select (date_trunc('week', (now() at time zone 'America/La_Paz')::date)::date - 7) as d0,
           (date_trunc('week', (now() at time zone 'America/La_Paz')::date)::date - 1) as d1
  ),
  tot as (
    select s.user_id, sum(s.steps)::bigint as steps
    from steps_daily s
    join profiles p on p.id = s.user_id
    cross join w
    where s.day between w.d0 and w.d1 and coalesce(p.ranking_visible, true)
    group by s.user_id having sum(s.steps) > 0
  ),
  ranked as (select user_id, steps, rank() over (order by steps desc) as pos, count(*) over () as n from tot)
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select r.user_id,
         'Tu semana en Camina',
         'Caminaste ' || replace(to_char(r.steps, 'FM999,999,999'), ',', '.') || ' pasos y quedaste #' || r.pos || ' de ' || r.n || '. Hoy arranca el ranking nuevo.',
         jsonb_build_object('type', 'weekly_rank'),
         'weekly_rank:' || (select d0 from w) || ':' || r.user_id
  from ranked r
  where not exists (select 1 from group_members gm where gm.user_id = r.user_id)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$f$;
revoke execute on function queue_weekly_rank_notifications() from public, anon, authenticated;
grant execute on function queue_weekly_rank_notifications() to service_role;

-- El aviso de racha, en español neutro.
do $$
declare def text;
begin
  select pg_get_functiondef('public.queue_streak_reminder_notifications()'::regprocedure) into def;
  def := replace(def, 'Llevás ', 'Llevas ');
  def := replace(def, 'Una caminatita más y la mantenés.', 'Una caminata más y la mantienes.');
  execute def;
end $$;

-- 11:00 de Bolivia todos los días (la función decide si hoy toca) y lunes 8:00 de Bolivia.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('queue-route-reminders', 'queue-weekly-rank');
    perform cron.schedule('queue-route-reminders', '0 15 * * *', 'select queue_route_reminder_notifications()');
    perform cron.schedule('queue-weekly-rank', '0 12 * * 1', 'select queue_weekly_rank_notifications()');
  end if;
end $$;
