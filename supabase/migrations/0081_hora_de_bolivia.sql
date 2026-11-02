-- 0081: todo "hoy" del servidor se calcula con la hora de Bolivia (America/La_Paz, UTC-4).
-- La base corre en UTC: current_date cambia a las 20:00 de Bolivia. Dos funciones seguían usándolo.
-- No toca semanas ni pasos ya guardados: solo cambia cómo se calcula "hoy" desde ahora.

create or replace function public.points_earned_today(p_user_id uuid)
returns integer
language sql
stable
set search_path to 'public'
as $f$
  select coalesce(sum(amount), 0)::integer
  from points_ledger
  where user_id = p_user_id
    and reason = 'steps'
    and ref_day = local_today();
$f$;

create or replace function public.queue_expiring_points_notifications()
returns void
language sql
security definer
set search_path to 'public'
as $f$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select u.user_id,
         'Tus Puntos te están esperando 🎁',
         'Tenés ' || e.amount || ' ' || (case when e.amount = 1 then 'Punto que se vence' else 'Puntos que se vencen' end)
           || ' en los próximos 5 días. Pasá por un comercio y canjealos antes de perderlos.',
         jsonb_build_object('type', 'points_expiring'),
         'points_expiring:' || u.user_id || ':' || local_today()
  from (select distinct user_id from points_ledger where amount > 0 and expires_at between now() and now() + interval '5 days') u
  cross join lateral points_expiring_for(u.user_id, 5) e
  where e.amount > 0
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$f$;
