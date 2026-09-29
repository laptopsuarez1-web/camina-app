-- Avisos más amigables, recordatorio de racha, versión mínima obligatoria,
-- favoritos y tope de pasos plausibles por día (antifraude).

-- ---------- Tope de pasos por día ----------
-- Nadie camina más de ~60.000 pasos en un día: se recorta en el servidor por si
-- alguien manda un número inventado directo a la API.
create or replace function clamp_daily_steps() returns trigger as $$
begin
  new.steps := least(new.steps, 60000);
  return new;
end;
$$ language plpgsql;

drop trigger if exists steps_daily_clamp on steps_daily;
create trigger steps_daily_clamp before insert or update on steps_daily
  for each row execute function clamp_daily_steps();

-- ---------- Código de canje por vencer ----------
create or replace function queue_expiring_redemption_notifications() returns void as $$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select r.user_id,
         '¡Ojo, que se te va el código! ⏳',
         'Tu canje en ' || b.name || ' vence en un ratito. Corré al local y mostralo antes de que se venza.',
         jsonb_build_object('type', 'redemption_expiring', 'redemption_id', r.id),
         'redemption_expiring:' || r.id
  from redemptions r
  join businesses b on b.id = r.business_id
  where r.status = 'pending'
    and r.code_expires_at between now() and now() + interval '3 minutes'
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;

-- ---------- Puntos por vencer ----------
create or replace function queue_expiring_points_notifications() returns void as $$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select user_id,
         'Tus Puntos te están esperando 🎁',
         'Tenés ' || sum(amount) || ' ' || (case when sum(amount) = 1 then 'Punto que se vence' else 'Puntos que se vencen' end)
           || ' en los próximos 5 días. Pasá por un comercio y canjealos antes de perderlos.',
         jsonb_build_object('type', 'points_expiring'),
         'points_expiring:' || user_id || ':' || current_date
  from points_ledger
  where amount > 0
    and expires_at between now() and now() + interval '5 days'
  group by user_id
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;

-- ---------- Recordatorio de racha ----------
-- Se corre a las 20:00 de La Paz (00:00 UTC). Avisa a quien viene con racha
-- (metas cumplidas hasta ayer) y hoy todavía no llegó a su meta.
create or replace function queue_streak_reminder_notifications() returns void as $$
  with today as (
    select (now() at time zone 'America/La_Paz')::date as d
  ),
  hit as (
    select s.user_id, s.day,
           s.day - (row_number() over (partition by s.user_id order by s.day))::int as grp
    from steps_daily s
    join profiles p on p.id = s.user_id
    where s.steps >= p.daily_goal
      and s.day < (select d from today)
      and s.day >= (select d from today) - 60
  ),
  streaks as (
    select user_id, grp, count(*) as len, max(day) as last_day
    from hit group by user_id, grp
  ),
  active as (
    select user_id, len from streaks
    where last_day = (select d from today) - 1 and len >= 2
  )
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select a.user_id,
         '¡No cortés tu racha! 🔥',
         'Llevás ' || a.len || ' días seguidos cumpliendo tu meta. Una caminatita más y la mantenés.',
         jsonb_build_object('type', 'streak_reminder'),
         'streak_reminder:' || a.user_id || ':' || (select d from today)
  from active a
  join profiles p on p.id = a.user_id
  left join steps_daily t on t.user_id = a.user_id and t.day = (select d from today)
  where coalesce(t.steps, 0) < p.daily_goal
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('queue-streak-reminders', '0 0 * * *', 'select queue_streak_reminder_notifications()');
  end if;
end $$;

-- ---------- Configuración de la app (versión mínima) ----------
create table if not exists app_config (
  key text primary key,
  value text not null
);
alter table app_config enable row level security;
drop policy if exists "app_config: public read" on app_config;
create policy "app_config: public read" on app_config for select using (true);

insert into app_config (key, value) values
  ('min_version_ios', '1.0.0'),
  ('min_version_android', '1.0.0'),
  ('store_url_ios', ''),
  ('store_url_android', '')
on conflict (key) do nothing;

-- ---------- Favoritos ----------
create table if not exists favorite_businesses (
  user_id uuid not null references profiles (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
alter table favorite_businesses enable row level security;
create policy "favorites: select own" on favorite_businesses for select using (auth.uid() = user_id);
create policy "favorites: insert own" on favorite_businesses for insert with check (auth.uid() = user_id);
create policy "favorites: delete own" on favorite_businesses for delete using (auth.uid() = user_id);

-- ---------- Bandeja de avisos (campanita) ----------
-- Cada usuario puede leer sus propios avisos (los mismos que salen como push).
create policy "outbox: select own" on notifications_outbox for select using (auth.uid() = user_id);
