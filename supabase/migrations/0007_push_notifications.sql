-- Notificaciones push reales: token del dispositivo (Expo Push Token) guardado
-- server-side, una cola de notificaciones a enviar (notifications_outbox) y los
-- triggers/jobs que la llenan. El envío real (llamar a la API de Expo) lo hace
-- la Edge Function supabase/functions/send-push-notifications, disparada por un
-- Database Webhook en insert sobre notifications_outbox (se configura desde el
-- dashboard, ver README).

-- ---------- PUSH TOKENS ----------
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

alter table push_tokens enable row level security;

create policy "push_tokens: select own" on push_tokens for select
  using (auth.uid() = user_id);
create policy "push_tokens: insert own" on push_tokens for insert
  with check (auth.uid() = user_id);
create policy "push_tokens: update own" on push_tokens for update
  using (auth.uid() = user_id);
create policy "push_tokens: delete own" on push_tokens for delete
  using (auth.uid() = user_id);

create index push_tokens_user_idx on push_tokens (user_id);

-- Un mismo token de dispositivo puede haber quedado antes asociado a otro
-- usuario (reinstaló la app con otra cuenta) — upsert por token, no por user.
create or replace function register_push_token(p_token text, p_platform text) returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  insert into push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function register_push_token(text, text) to authenticated;

-- ---------- NOTIFICATIONS OUTBOX ----------
-- Cola de notificaciones pendientes de mandar. La Edge Function las procesa y
-- marca sent_at; el Database Webhook la dispara en cada insert.
create table notifications_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text, -- evita mandar la misma notificación dos veces (ej. "points_expiring:<user>:<date>")
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table notifications_outbox enable row level security;
-- Nadie lee/escribe esto desde el cliente: solo funciones security definer y
-- la Edge Function (con la service role key, que salta RLS).

create unique index notifications_outbox_dedupe_idx on notifications_outbox (dedupe_key) where dedupe_key is not null;
create index notifications_outbox_unsent_idx on notifications_outbox (created_at) where sent_at is null;

create or replace function queue_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb, p_dedupe_key text)
returns void as $$
begin
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  values (p_user_id, p_title, p_body, coalesce(p_data, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Referido acreditado ----------
-- credit_referral_on_first_points (0001_init.sql) ya acredita los 5 Puntos al
-- referente cuando el referido gana sus primeros Puntos; acá se agrega el
-- aviso, reemplazando la función completa (mismo cuerpo + queue_notification).
create or replace function credit_referral_on_first_points() returns trigger as $$
declare
  v_ref referrals%rowtype;
begin
  if new.reason = 'steps' then
    select * into v_ref from referrals
      where referred_user_id = new.user_id and credited = false;
    if found then
      insert into points_ledger (user_id, amount, reason, expires_at)
      values (v_ref.referrer_user_id, 5, 'referral', now() + (points_ttl_days() || ' days')::interval);
      update referrals set credited = true where id = v_ref.id;
      perform queue_notification(
        v_ref.referrer_user_id,
        '¡Ganaste 5 Puntos!',
        'Tu referido empezó a caminar con Camina. Gracias por invitarlo 🎉',
        jsonb_build_object('type', 'referral_credited'),
        null
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Código de canje por vencer ----------
-- Corre cada minuto (pg_cron, ver abajo). Avisa cuando a un código pendiente
-- le quedan entre 2 y 3 minutos — una sola vez por canje (dedupe_key).
create or replace function queue_expiring_redemption_notifications() returns void as $$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select r.user_id,
         'Tu código está por vencer',
         'El código de ' || b.name || ' vence en unos minutos. Mostralo en el local antes de que se venza.',
         jsonb_build_object('type', 'redemption_expiring', 'redemption_id', r.id),
         'redemption_expiring:' || r.id
  from redemptions r
  join businesses b on b.id = r.business_id
  where r.status = 'pending'
    and r.code_expires_at between now() and now() + interval '3 minutes'
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;

-- ---------- Puntos por vencer ----------
-- Corre una vez al día (pg_cron). Agrupa por usuario los lotes de Puntos que
-- vencen en los próximos 5 días y manda un solo aviso por usuario y por día.
create or replace function queue_expiring_points_notifications() returns void as $$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select user_id,
         'Se te vencen Puntos',
         'Tenés ' || sum(amount) || ' ' || (case when sum(amount) = 1 then 'Punto que vence' else 'Puntos que vencen' end) || ' en los próximos 5 días. Canjealos antes de perderlos.',
         jsonb_build_object('type', 'points_expiring'),
         'points_expiring:' || user_id || ':' || current_date
  from points_ledger
  where amount > 0
    and expires_at between now() and now() + interval '5 days'
  group by user_id
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$ language sql security definer set search_path = public;

-- ---------- pg_cron ----------
-- Requiere la extensión pg_cron habilitada (Database → Extensions en el
-- dashboard de Supabase; en proyectos nuevos ya viene disponible). Si no está
-- habilitada, este bloque no rompe el resto de la migración, pero los jobs no
-- quedan programados — hay que correr este mismo `select cron.schedule(...)`
-- a mano desde el SQL Editor una vez habilitada.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('queue-expiring-redemptions', '* * * * *', 'select queue_expiring_redemption_notifications()');
    perform cron.schedule('queue-expiring-points', '0 12 * * *', 'select queue_expiring_points_notifications()');
  end if;
end $$;
