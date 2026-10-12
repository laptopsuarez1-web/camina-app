-- Historias de Instagram por un canje: después de un canje confirmado, la persona sube una foto de lo que canjeó
-- a su historia y etiqueta a @caminaapp. Avisa desde la app (con su usuario de Instagram) y queda pendiente. El
-- equipo de Camina la busca en Instagram y la aprueba o rechaza desde el panel de administrador; al aprobarla se
-- acreditan story_reward_points() Puntos (motivo 'challenge', nota "Historia en Instagram: ...") y le llega un aviso.
--
-- Una sola historia premiada por canje. Si se rechaza, se puede volver a mandar. Solo canjes confirmados en los
-- últimos story_window_days() días.

create or replace function story_reward_points() returns integer as $$ select 5 $$ language sql immutable set search_path = public;
create or replace function story_window_days() returns integer as $$ select 7 $$ language sql immutable set search_path = public;

create table story_shares (
  id uuid primary key default gen_random_uuid(),
  redemption_id uuid not null unique references redemptions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  photo_path text not null,           -- en el bucket privado story-photos: <user_id>/<archivo>
  instagram_handle text not null,     -- sin @, en minúsculas
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);
create index story_shares_pending_idx on story_shares (status, created_at);
create index story_shares_user_idx on story_shares (user_id);

alter table story_shares enable row level security;
create policy "story_shares: select own or admin" on story_shares for select
  using (auth.uid() = user_id or is_admin());
-- Sin políticas de escritura: todo pasa por las funciones de abajo.
revoke insert, update, delete on story_shares from anon, authenticated;

-- Fotos: bucket PRIVADO. Cada persona sube solo a su carpeta; las ve ella y el equipo de Camina.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-photos', 'story-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "story-photos: owner write" on storage.objects for insert
  with check (bucket_id = 'story-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "story-photos: owner or admin read" on storage.objects for select
  using (bucket_id = 'story-photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ---------- La persona avisa que subió la historia ----------
create or replace function submit_story_share(p_redemption_id uuid, p_photo_path text, p_instagram text)
returns story_shares as $$
declare
  r redemptions;
  s story_shares;
  v_handle text := lower(btrim(regexp_replace(coalesce(p_instagram, ''), '^\s*@', '')));
  v_bname text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'Revisá tu usuario de Instagram: solo letras, números, puntos y guiones bajos.';
  end if;
  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> auth.uid()::text or p_photo_path like '%..%' then
    raise exception 'No encontramos la foto. Volvé a elegirla.';
  end if;

  select * into r from redemptions where id = p_redemption_id and user_id = auth.uid();
  if not found then
    raise exception 'Canje no encontrado';
  end if;
  if r.status <> 'confirmed' then
    raise exception 'Solo podés subir una historia de un canje confirmado.';
  end if;
  if r.confirmed_at < now() - (story_window_days() || ' days')::interval then
    raise exception 'Pasaron más de % días de este canje.', story_window_days();
  end if;

  select * into s from story_shares where redemption_id = r.id for update;
  if found then
    if s.status = 'approved' then
      raise exception 'Ya te acreditamos los Puntos por esta historia.';
    elsif s.status = 'pending' then
      raise exception 'Ya nos avisaste de esta historia. La estamos revisando.';
    end if;
    update story_shares
       set photo_path = p_photo_path, instagram_handle = v_handle, status = 'pending',
           created_at = now(), decided_at = null, decided_by = null
     where id = s.id
    returning * into s;
  else
    insert into story_shares (redemption_id, user_id, business_id, photo_path, instagram_handle)
    values (r.id, auth.uid(), r.business_id, p_photo_path, v_handle)
    returning * into s;
  end if;

  -- Aviso al equipo de Camina (también lo ven en el panel, sección Historias).
  select name into v_bname from businesses where id = r.business_id;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select a.user_id, 'Nueva historia para revisar 📸',
         '@' || v_handle || ' subió una historia de ' || coalesce(v_bname, 'un canje') || '.',
         jsonb_build_object('type', 'story_review', 'story_id', s.id),
         'story_review:' || s.id || ':' || a.user_id || ':' || extract(epoch from s.created_at)::bigint
  from app_admins a
  where exists (select 1 from profiles p where p.id = a.user_id)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return s;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Panel: lista para el equipo ----------
create or replace function admin_story_shares(p_status text default 'pending')
returns table (
  id uuid, status text, created_at timestamptz, decided_at timestamptz, photo_path text, instagram_handle text,
  user_id uuid, user_name text, business_name text, benefit_name text, redemption_confirmed_at timestamptz
) as $$
  select s.id, s.status, s.created_at, s.decided_at, s.photo_path, s.instagram_handle,
         s.user_id, p.full_name, b.name, bn.name, r.confirmed_at
  from story_shares s
  join redemptions r on r.id = s.redemption_id
  left join profiles p on p.id = s.user_id
  left join businesses b on b.id = s.business_id
  left join benefits bn on bn.id = r.benefit_id
  where is_admin() and s.status = coalesce(p_status, 'pending')
  order by case when coalesce(p_status, 'pending') = 'pending' then s.created_at end asc,
           s.decided_at desc nulls last
  limit 200;
$$ language sql stable security definer set search_path = public;

-- ---------- Panel: aprobar (acredita los Puntos) o rechazar ----------
create or replace function admin_decide_story_share(p_id uuid, p_approve boolean) returns story_shares as $$
declare
  s story_shares;
  v_bname text;
  v_pts integer := story_reward_points();
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede aprobar historias.';
  end if;
  select * into s from story_shares where id = p_id for update;
  if not found then
    raise exception 'Historia no encontrada';
  end if;
  if s.status <> 'pending' then
    raise exception 'Esta historia ya fue revisada.';
  end if;

  update story_shares
     set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now(), decided_by = auth.uid()
   where id = s.id
  returning * into s;

  select name into v_bname from businesses where id = s.business_id;
  if p_approve then
    insert into points_ledger (user_id, amount, reason, expires_at, note)
    values (s.user_id, v_pts, 'challenge', now() + (points_ttl_days() || ' days')::interval,
            'Historia en Instagram: ' || coalesce(v_bname, 'tu canje'));
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (s.user_id, '¡Gracias por tu historia! 📸',
            'Te acreditamos ' || v_pts || ' Puntos por tu historia de ' || coalesce(v_bname, 'tu canje') || '.',
            jsonb_build_object('type', 'story_approved', 'story_id', s.id), 'story_approved:' || s.id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  else
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (s.user_id, 'No encontramos tu historia',
            'Revisá que etiquetaste a @caminaapp y que tu cuenta deja ver historias. Podés volver a mandarla desde Tus canjes.',
            jsonb_build_object('type', 'story_rejected', 'story_id', s.id),
            'story_rejected:' || s.id || ':' || extract(epoch from s.decided_at)::bigint)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return s;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function story_reward_points(), story_window_days(),
  submit_story_share(uuid, text, text), admin_story_shares(text), admin_decide_story_share(uuid, boolean)
  from public, anon;
grant execute on function story_reward_points(), story_window_days(),
  submit_story_share(uuid, text, text), admin_story_shares(text), admin_decide_story_share(uuid, boolean)
  to authenticated;
