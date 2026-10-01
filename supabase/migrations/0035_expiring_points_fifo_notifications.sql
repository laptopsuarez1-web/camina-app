-- "Puntos por vencer" descontando lo que ya se gastó (FIFO), también para el aviso diario.
create or replace function points_expiring_for(p_user uuid, p_within_days integer)
returns table (amount integer, days integer) as $$
  with spent as (
    select coalesce(-sum(l.amount), 0) as s from points_ledger l where l.user_id = p_user and l.amount < 0
  ), pos as (
    select l.amount, l.expires_at,
           sum(l.amount) over (order by l.expires_at nulls last, l.earned_at, l.id) as run
    from points_ledger l where l.user_id = p_user and l.amount > 0
  ), rem as (
    select p.expires_at, greatest(0, least(p.amount, p.run - sp.s)) as r from pos p cross join spent sp
  )
  select coalesce(sum(r), 0)::integer,
         coalesce(greatest(0, ceil(extract(epoch from (min(expires_at) - now())) / 86400)), 0)::integer
  from rem
  where r > 0 and expires_at > now() and expires_at <= now() + (p_within_days || ' days')::interval;
$$ language sql stable security definer set search_path = public;
revoke execute on function points_expiring_for(uuid, integer) from public, anon, authenticated;

create or replace function points_expiring_soon(p_within_days integer default 14)
returns table (amount integer, days integer) as $$
  select * from points_expiring_for(auth.uid(), p_within_days);
$$ language sql stable security definer set search_path = public;

create or replace function queue_expiring_points_notifications() returns void as $$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select u.user_id,
         'Tus Puntos te están esperando 🎁',
         'Tenés ' || e.amount || ' ' || (case when e.amount = 1 then 'Punto que se vence' else 'Puntos que se vencen' end)
           || ' en los próximos 5 días. Pasá por un comercio y canjealos antes de perderlos.',
         jsonb_build_object('type', 'points_expiring'),
         'points_expiring:' || u.user_id || ':' || current_date
  from (select distinct user_id from points_ledger where amount > 0 and expires_at between now() and now() + interval '5 days') u
  cross join lateral points_expiring_for(u.user_id, 5) e
  where e.amount > 0
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;
revoke execute on function queue_expiring_points_notifications() from public, anon, authenticated;
