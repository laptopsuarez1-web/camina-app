-- 0112: aviso de los sábados (10:00 de Bolivia) para animar a usar los Puntos.
-- A quien le alcanza para al menos un premio y no canjeó nada en los últimos 7 días: cuántos Puntos tiene y para cuántos premios le alcanza.
-- Uno por persona por semana. Solo encola avisos. Se revierte con cron.unschedule('queue-spend-nudge').
create or replace function queue_spend_nudge_notifications() returns void
language sql security definer set search_path = public
as $f$
  with bal as (
    select p.id as user_id, user_points_balance(p.id)::int as pts from profiles p
  ),
  can as (
    select b.user_id, b.pts,
           (select count(*) from benefits be join businesses bu on bu.id = be.business_id
             where be.active and coalesce(bu.approved, false) and not coalesce(be.fans_only, false) and be.cost_points <= b.pts)::int as n
    from bal b where b.pts > 0
  )
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select c.user_id,
         'Tus Puntos ya alcanzan 🎁',
         'Tienes ' || replace(to_char(c.pts, 'FM999,999,999'), ',', '.') || case when c.pts = 1 then ' Punto' else ' Puntos' end
           || ': te alcanza para ' || c.n || case when c.n = 1 then ' premio' else ' premios' end || '. Date un gusto este fin de semana.',
         jsonb_build_object('type', 'nearby'),
         'spend_nudge:' || date_trunc('week', (now() at time zone 'America/La_Paz')::date)::date || ':' || c.user_id
  from can c
  where c.n >= 1
    and not exists (select 1 from redemptions r where r.user_id = c.user_id and r.created_at > now() - interval '7 days')
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$f$;
revoke execute on function queue_spend_nudge_notifications() from public, anon, authenticated;
grant execute on function queue_spend_nudge_notifications() to service_role;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'queue-spend-nudge';
    perform cron.schedule('queue-spend-nudge', '0 14 * * 6', 'select queue_spend_nudge_notifications()');
  end if;
end $$;
