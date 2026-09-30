-- Moderación de contenido (mensajes y fotos), bloqueos y detección de cuentas repetidas por celular -------------

alter table profiles add column if not exists suspended boolean not null default false;

-- ---------- Bloqueos entre personas ----------
create table if not exists user_blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table user_blocks enable row level security;
create policy "blocks: own read" on user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: own insert" on user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: own delete" on user_blocks for delete to authenticated using (blocker_id = auth.uid());

-- ---------- Reportes ----------
create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles (id) on delete set null,
  kind text not null check (kind in ('message', 'photo', 'user')),
  message_id uuid,
  target_user_id uuid references profiles (id) on delete cascade,
  reason text not null check (reason in ('acoso', 'sexual', 'spam', 'odio', 'otro')),
  snapshot text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table content_reports enable row level security;
create policy "reports: admin read" on content_reports for select to authenticated using (is_admin());
-- Se escribe solo con report_content() y admin_resolve_report().

create or replace function report_content(p_kind text, p_target_user uuid, p_message uuid, p_reason text)
returns void as $$
declare
  v_snap text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  if p_kind = 'message' then
    select text, user_id into v_snap, p_target_user from group_notes where id = p_message;
    if p_target_user is null then
      raise exception 'Mensaje no encontrado';
    end if;
  elsif p_kind = 'photo' then
    select photo_url into v_snap from profiles where id = p_target_user;
  end if;
  -- Un mismo reporte no se repite: evita que alguien inunde la lista.
  if exists (
    select 1 from content_reports
    where reporter_id = auth.uid() and kind = p_kind and target_user_id = p_target_user
      and coalesce(message_id::text, '') = coalesce(p_message::text, '') and status = 'open'
  ) then
    return;
  end if;
  insert into content_reports (reporter_id, kind, message_id, target_user_id, reason, snapshot)
  values (auth.uid(), p_kind, p_message, p_target_user, p_reason, v_snap);
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function report_content(text, uuid, uuid, text) to authenticated;

create or replace function pending_reports()
returns table (id uuid, kind text, reason text, snapshot text, created_at timestamptz, reporter_name text, target_user_id uuid, target_name text, suspended boolean, message_id uuid) as $$
  select r.id, r.kind, r.reason, r.snapshot, r.created_at, rp.full_name, r.target_user_id, tp.full_name, tp.suspended, r.message_id
  from content_reports r
  left join profiles rp on rp.id = r.reporter_id
  left join profiles tp on tp.id = r.target_user_id
  where r.status = 'open' and is_admin()
  order by r.created_at;
$$ language sql stable security definer set search_path = public;
grant execute on function pending_reports() to authenticated;

-- El equipo resuelve: borrar el contenido, suspender a la persona o descartar.
create or replace function admin_resolve_report(p_id uuid, p_action text) returns void as $$
declare
  r content_reports;
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede resolver reportes.';
  end if;
  select * into r from content_reports where id = p_id and status = 'open';
  if r.id is null then
    return;
  end if;
  if p_action = 'delete_content' then
    if r.kind = 'message' and r.message_id is not null then
      delete from group_notes where id = r.message_id;
    elsif r.kind = 'photo' then
      update profiles set photo_url = null where id = r.target_user_id;
    end if;
  elsif p_action = 'suspend_user' then
    update profiles set suspended = true, photo_url = null where id = r.target_user_id;
    delete from group_notes where user_id = r.target_user_id;
  end if;
  update content_reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end, decided_at = now()
   where id = p_id;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function admin_resolve_report(uuid, text) to authenticated;

create or replace function admin_unsuspend_user(p_user uuid) returns void as $$
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede hacer esto.';
  end if;
  update profiles set suspended = false where id = p_user;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function admin_unsuspend_user(uuid) to authenticated;

-- ---------- Mensajes de grupo: borrar, filtro, límites y suspensión ----------
alter table group_notes drop constraint if exists group_notes_text_len;
alter table group_notes add constraint group_notes_text_len check (char_length(text) between 1 and 500) not valid;

-- Cada persona borra sus mensajes; quien creó el grupo puede borrar cualquiera de su grupo.
create policy "group_notes: delete own or creator" on group_notes for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from groups g where g.id = group_id and g.created_by = auth.uid())
  );

create table if not exists banned_words (
  word text primary key check (word = lower(word))
);
alter table banned_words enable row level security;
create policy "banned_words: admin all" on banned_words for all to authenticated using (is_admin()) with check (is_admin());
insert into banned_words (word) values
  ('puta'), ('puto'), ('mierda'), ('carajo'), ('pendejo'), ('pendeja'), ('cabron'), ('cabrona'), ('verga'),
  ('chingar'), ('chinga'), ('conchudo'), ('maricon'), ('marica'), ('hijueputa'), ('hdp'), ('ctm'),
  ('idiota'), ('imbecil'), ('estupido'), ('estupida'), ('zorra'), ('violacion'), ('nazi')
on conflict do nothing;

create or replace function guard_group_note() returns trigger as $$
declare
  v_clean text := translate(lower(new.text), 'áéíóúüñ', 'aeiouun');
begin
  if exists (select 1 from profiles where id = new.user_id and suspended) then
    raise exception 'Tu cuenta está suspendida.';
  end if;
  if (select count(*) from group_notes where user_id = new.user_id and created_at > now() - interval '1 minute') >= 8 then
    raise exception 'Estás escribiendo muy rápido. Esperá un momento.';
  end if;
  if exists (
    select 1 from banned_words w
    where v_clean ~ ('(^|[^a-z0-9])' || w.word || '([^a-z0-9]|$)')
  ) then
    raise exception 'Tu mensaje tiene palabras no permitidas. Escribilo de otra forma.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists group_notes_guard on group_notes;
create trigger group_notes_guard before insert on group_notes for each row execute function guard_group_note();

-- Los mensajes se guardan 90 días (los textos pesan poco, pero no hace falta acumularlos).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-old-group-notes';
    perform cron.schedule('purge-old-group-notes', '30 5 * * 0', $cron$delete from public.group_notes where created_at < now() - interval '90 days'$cron$);
  end if;
end $$;

-- ---------- Celulares y cuentas repetidas ----------
create table if not exists user_devices (
  device_id text not null check (char_length(device_id) between 6 and 128),
  user_id uuid not null references profiles (id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (device_id, user_id)
);
alter table user_devices enable row level security;
-- Sin policies: solo se escribe con register_device() y solo la lee el equipo.

create or replace function register_device(p_device_id text) returns void as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  insert into user_devices (device_id, user_id) values (p_device_id, auth.uid())
  on conflict (device_id, user_id) do update set last_seen = now();
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function register_device(text) to authenticated;

-- Alertas semanales para el equipo: celulares con varias cuentas.
create or replace function flagged_devices()
returns table (device_id text, accounts integer, names text, last_seen timestamptz) as $$
  select d.device_id, count(distinct d.user_id)::int, string_agg(distinct coalesce(p.full_name, '(sin nombre)'), ', '), max(d.last_seen)
  from user_devices d join profiles p on p.id = d.user_id
  where is_admin()
  group by d.device_id
  having count(distinct d.user_id) > 1
  order by count(distinct d.user_id) desc, max(d.last_seen) desc
  limit 100;
$$ language sql stable security definer set search_path = public;
grant execute on function flagged_devices() to authenticated;

-- Invitaciones donde quien invita y quien se sumó comparten celular.
create or replace function suspicious_referrals()
returns table (referrer_name text, referred_name text, created_at timestamptz) as $$
  select rp.full_name, dp.full_name, r.created_at
  from referrals r
  join profiles rp on rp.id = r.referrer_user_id
  join profiles dp on dp.id = r.referred_user_id
  where is_admin() and exists (
    select 1 from user_devices a join user_devices b on a.device_id = b.device_id
    where a.user_id = r.referrer_user_id and b.user_id = r.referred_user_id
  )
  order by r.created_at desc
  limit 100;
$$ language sql stable security definer set search_path = public;
grant execute on function suspicious_referrals() to authenticated;
