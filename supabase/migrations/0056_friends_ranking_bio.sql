-- Amigos, ranking semanal abierto, invitaciones de grupo a amigos y "Sobre mí" en el perfil.
--
-- Qué hace:
--   1) Ranking global siempre abierto: global_weekly_ranking ya no espera a los 1.000 usuarios (vuelve a la 0006, con la
--      condición de la 0048 afuera) y no muestra a quien bloqueaste ni a quien te bloqueó. Nuevo my_weekly_rank() = tu puesto.
--   2) Amistad con aceptación mutua: tabla friendships (solo se escribe con las funciones de abajo) y funciones
--      send_friend_request, respond_friend_request, remove_friend, my_friends, friend_requests_incoming, friends_weekly_ranking
--      y friend_card. Los pasos, la racha y el historial de alguien solo los ven sus amigos que aceptaron.
--   3) Bloquear (user_blocks, 0027) corta la amistad y las invitaciones pendientes entre las dos personas.
--   4) Invitar amigos a un grupo: group_invites + invite_friends_to_group, pending_group_invites, accept_group_invite,
--      decline_group_invite. Quien recibe la invitación entra al aceptar (los grupos siguen siendo privados, 0055).
--   5) profiles.bio: descripción de hasta 80 caracteres, con el filtro de palabras de nombres y grupos (text_is_clean).
--      No se agrega a public_profiles: se lee solo con friend_card (amigos y gente que comparte un grupo).
--   6) capture_referral (0005) ahora, además de anotar el referido, manda una solicitud de amistad al referente.
-- Idempotente: sí.
-- Cómo se revierte: volver a aplicar global_weekly_ranking de 0048 y capture_referral de 0005; drop table friendships,
--   group_invites; drop de las funciones nuevas (lista al final); alter table profiles drop column bio.

-- ---------- 1) Descripción ("Sobre mí") ----------
alter table profiles add column if not exists bio text;
alter table profiles drop constraint if exists profiles_bio_len;
alter table profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 80);

create or replace function guard_profile_bio() returns trigger as $$
begin
  new.bio := nullif(btrim(new.bio), '');
  if new.bio is not null and not text_is_clean(new.bio) then
    raise exception 'Tu descripción tiene palabras no permitidas.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists profiles_bio_guard on profiles;
create trigger profiles_bio_guard before insert or update of bio on profiles for each row execute function guard_profile_bio();
revoke execute on function guard_profile_bio() from public, anon, authenticated;

-- ---------- 2) Tablas ----------
create table if not exists friendships (
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_key on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on friendships (addressee_id, status);
alter table friendships enable row level security;
drop policy if exists "friendships: parties read" on friendships;
create policy "friendships: parties read" on friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
-- Sin políticas de insert/update/delete: solo se escribe con las funciones de abajo.

create table if not exists group_invites (
  group_id uuid not null references groups (id) on delete cascade,
  invitee_id uuid not null references profiles (id) on delete cascade,
  inviter_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, invitee_id)
);
alter table group_invites enable row level security;
-- Sin políticas: la bandeja se lee con pending_group_invites().

-- ---------- Ayudantes internos (nadie con cuenta los ejecuta directo) ----------
create or replace function users_blocked(a uuid, b uuid) returns boolean as $$
  select exists (
    select 1 from user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$ language sql stable security definer set search_path = public;

create or replace function are_friends(a uuid, b uuid) returns boolean as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$ language sql stable security definer set search_path = public;

-- Racha: días seguidos (terminando hoy o ayer) con pasos >= la meta de ese día (mínimo 1.000, MIN_DAILY_GOAL de la app).
create or replace function user_streak(p_user uuid) returns integer as $$
  with ok_days as (
    select s.day, s.day - (row_number() over (order by s.day))::int as grp
    from steps_daily s
    join profiles p on p.id = s.user_id
    where s.user_id = p_user
      and s.day >= local_today() - 120
      and s.steps >= greatest(coalesce(nullif(s.goal, 0), p.daily_goal), 1000)
  ),
  islands as (
    select count(*)::int as len, max(day) as last_day from ok_days group by grp
  )
  select coalesce((select len from islands where last_day >= local_today() - 1 order by last_day desc limit 1), 0);
$$ language sql stable security definer set search_path = public;

revoke execute on function users_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function are_friends(uuid, uuid) from public, anon, authenticated;
revoke execute on function user_streak(uuid) from public, anon, authenticated;

-- Solicitud de amistad (núcleo: lo usan send_friend_request y capture_referral).
-- Devuelve: 'sent' | 'accepted' (la otra persona ya te había mandado una) | 'friends' | 'pending' | 'unavailable' (bloqueo o no existe).
create or replace function friend_request_core(p_me uuid, p_user uuid) returns text as $$
declare
  v_row friendships;
  v_name text;
begin
  if p_me is null or p_user is null or p_me = p_user then
    raise exception 'No podés agregarte a vos mismo.';
  end if;
  select full_name into v_name from profiles where id = p_me;
  if not exists (select 1 from profiles where id = p_user) or users_blocked(p_me, p_user) then
    return 'unavailable';
  end if;

  select * into v_row from friendships
   where (requester_id = p_me and addressee_id = p_user) or (requester_id = p_user and addressee_id = p_me);
  if found then
    if v_row.status = 'accepted' then return 'friends'; end if;
    if v_row.requester_id = p_me then return 'pending'; end if;
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = p_user and addressee_id = p_me;
    perform queue_notification(p_user, 'Nueva amistad',
      coalesce(v_name, 'Alguien') || ' aceptó tu solicitud. Ya pueden ver sus pasos.',
      jsonb_build_object('type', 'friend_accepted', 'user_id', p_me),
      'friend_accepted:' || p_me || ':' || p_user || ':' || local_today());
    return 'accepted';
  end if;

  if (select count(*) from friendships where requester_id = p_me and status = 'pending') >= 50 then
    raise exception 'Tenés muchas solicitudes sin responder. Esperá a que contesten.';
  end if;

  insert into friendships (requester_id, addressee_id) values (p_me, p_user);
  perform queue_notification(p_user, 'Solicitud de amistad',
    coalesce(v_name, 'Alguien') || ' quiere ser tu amigo en Camina.',
    jsonb_build_object('type', 'friend_request', 'user_id', p_me),
    'friend_request:' || p_me || ':' || p_user || ':' || local_today());
  return 'sent';
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function friend_request_core(uuid, uuid) from public, anon, authenticated;

-- ---------- 3) Funciones para la app ----------
create or replace function send_friend_request(p_user uuid) returns text as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  return friend_request_core(auth.uid(), p_user);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function respond_friend_request(p_user uuid, p_accept boolean) returns void as $$
declare
  v_me uuid := auth.uid();
  v_name text;
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  if not exists (select 1 from friendships where requester_id = p_user and addressee_id = v_me and status = 'pending') then
    return;
  end if;
  if p_accept and not users_blocked(v_me, p_user) then
    update friendships set status = 'accepted', accepted_at = now() where requester_id = p_user and addressee_id = v_me;
    select full_name into v_name from profiles where id = v_me;
    perform queue_notification(p_user, 'Nueva amistad',
      coalesce(v_name, 'Alguien') || ' aceptó tu solicitud. Ya pueden ver sus pasos.',
      jsonb_build_object('type', 'friend_accepted', 'user_id', v_me),
      'friend_accepted:' || v_me || ':' || p_user || ':' || local_today());
  else
    delete from friendships where requester_id = p_user and addressee_id = v_me;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Quitar a un amigo o cancelar una solicitud mía. No avisa a la otra persona.
create or replace function remove_friend(p_user uuid) returns void as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from friendships
   where (requester_id = auth.uid() and addressee_id = p_user) or (requester_id = p_user and addressee_id = auth.uid());
end;
$$ language plpgsql security definer set search_path = public;

create or replace function my_friends()
returns table (user_id uuid, full_name text, photo_url text, bio text, friends_since timestamptz, week_steps bigint, streak integer) as $$
  select p.id, p.full_name, p.photo_url, p.bio, f.accepted_at,
         coalesce((select sum(s.steps) from steps_daily s
                   where s.user_id = p.id and s.day >= date_trunc('week', local_today())::date), 0)::bigint,
         user_streak(p.id)
  from friendships f
  join profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() is not null
    and f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    and not users_blocked(auth.uid(), p.id)
  order by p.full_name;
$$ language sql stable security definer set search_path = public;

create or replace function friend_requests_incoming()
returns table (user_id uuid, full_name text, photo_url text, created_at timestamptz) as $$
  select p.id, p.full_name, p.photo_url, f.created_at
  from friendships f
  join profiles p on p.id = f.requester_id
  where auth.uid() is not null and f.addressee_id = auth.uid() and f.status = 'pending'
    and not users_blocked(auth.uid(), p.id)
  order by f.created_at desc;
$$ language sql stable security definer set search_path = public;

-- Ranking de la semana entre vos y tus amigos (aunque tengas el ranking global apagado: acá solo ven quienes aceptaron).
create or replace function friends_weekly_ranking()
returns table (user_id uuid, full_name text, photo_url text, total_steps bigint, streak integer, is_me boolean) as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from friendships f
    where f.status = 'accepted' and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  )
  select p.id, p.full_name, p.photo_url,
         coalesce((select sum(s.steps) from steps_daily s
                   where s.user_id = p.id and s.day >= date_trunc('week', local_today())::date), 0)::bigint as total_steps,
         user_streak(p.id),
         p.id = auth.uid()
  from people pe
  join profiles p on p.id = pe.id
  where auth.uid() is not null and (p.id = auth.uid() or not users_blocked(auth.uid(), p.id))
  order by total_steps desc, p.full_name;
$$ language sql stable security definer set search_path = public;

-- Ficha de una persona. relation: self | friend | pending_out | pending_in | none.
-- Pasos, racha y calendario: solo de uno mismo o de amigos. La descripción: también si comparten un grupo.
create or replace function friend_card(p_user uuid) returns jsonb as $$
declare
  v_me uuid := auth.uid();
  v_p profiles;
  v_f friendships;
  v_rel text;
  v_bio_visible boolean;
  v_out jsonb;
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  select * into v_p from profiles where id = p_user;
  if not found or (p_user <> v_me and users_blocked(v_me, p_user)) then
    return null;
  end if;

  if p_user = v_me then
    v_rel := 'self';
  else
    select * into v_f from friendships
     where (requester_id = v_me and addressee_id = p_user) or (requester_id = p_user and addressee_id = v_me);
    v_rel := case
      when not found then 'none'
      when v_f.status = 'accepted' then 'friend'
      when v_f.requester_id = v_me then 'pending_out'
      else 'pending_in'
    end;
  end if;

  v_bio_visible := v_rel in ('self', 'friend') or exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = v_me and b.user_id = p_user
  );

  v_out := jsonb_build_object(
    'user_id', v_p.id, 'full_name', v_p.full_name, 'photo_url', v_p.photo_url,
    'relation', v_rel, 'bio', case when v_bio_visible then v_p.bio end
  );

  if v_rel in ('self', 'friend') then
    v_out := v_out || jsonb_build_object(
      'friends_since', v_f.accepted_at,
      'streak', user_streak(p_user),
      'goal', v_p.daily_goal,
      'avg_week', coalesce((select round(sum(s.steps) / 7.0) from steps_daily s
                            where s.user_id = p_user and s.day > local_today() - 7), 0),
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', s.day, 'steps', s.steps, 'goal', coalesce(nullif(s.goal, 0), v_p.daily_goal)) order by s.day)
                        from steps_daily s where s.user_id = p_user and s.day > local_today() - 35), '[]'::jsonb)
    );
  end if;
  return v_out;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Cortar la amistad y las invitaciones pendientes cuando una persona bloquea a otra.
create or replace function cut_ties_on_block() returns trigger as $$
begin
  delete from friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id) or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  delete from group_invites
   where (inviter_id = new.blocker_id and invitee_id = new.blocked_id) or (inviter_id = new.blocked_id and invitee_id = new.blocker_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists user_blocks_cut_ties on user_blocks;
create trigger user_blocks_cut_ties after insert on user_blocks for each row execute function cut_ties_on_block();
revoke execute on function cut_ties_on_block() from public, anon, authenticated;

-- ---------- 4) Invitar amigos a un grupo ----------
create or replace function invite_friends_to_group(p_group uuid, p_users uuid[]) returns integer as $$
declare
  v_me uuid := auth.uid();
  v_group_name text;
  v_my_name text;
  v_user uuid;
  v_count integer := 0;
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  if p_users is null or cardinality(p_users) = 0 then return 0; end if;
  if cardinality(p_users) > 20 then raise exception 'Podés invitar hasta 20 amigos a la vez.'; end if;
  if not is_group_member(p_group) then raise exception 'Solo quienes están en el grupo pueden invitar.'; end if;
  select name into v_group_name from groups where id = p_group;
  select full_name into v_my_name from profiles where id = v_me;

  for v_user in select distinct u from unnest(p_users) u loop
    continue when v_user = v_me;
    continue when not are_friends(v_me, v_user) or users_blocked(v_me, v_user);
    continue when exists (select 1 from group_members where group_id = p_group and user_id = v_user);
    insert into group_invites (group_id, invitee_id, inviter_id) values (p_group, v_user, v_me)
      on conflict (group_id, invitee_id) do nothing;
    if found then
      v_count := v_count + 1;
      perform queue_notification(v_user, 'Te invitaron a un grupo',
        coalesce(v_my_name, 'Un amigo') || ' te invitó a "' || v_group_name || '".',
        jsonb_build_object('type', 'group_invite', 'group_id', p_group),
        'group_invite:' || p_group || ':' || v_user || ':' || local_today());
    end if;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function pending_group_invites()
returns table (group_id uuid, group_name text, inviter_name text, member_count integer, created_at timestamptz) as $$
  select g.id, g.name, p.full_name, (select count(*)::int from group_members m where m.group_id = g.id), i.created_at
  from group_invites i
  join groups g on g.id = i.group_id
  join profiles p on p.id = i.inviter_id
  where auth.uid() is not null and i.invitee_id = auth.uid() and not users_blocked(auth.uid(), i.inviter_id)
  order by i.created_at desc;
$$ language sql stable security definer set search_path = public;

create or replace function accept_group_invite(p_group uuid) returns uuid as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  if not exists (select 1 from group_invites where group_id = p_group and invitee_id = v_me) then
    return null;
  end if;
  insert into group_members (group_id, user_id) values (p_group, v_me) on conflict do nothing;
  delete from group_invites where group_id = p_group and invitee_id = v_me;
  return p_group;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function decline_group_invite(p_group uuid) returns void as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from group_invites where group_id = p_group and invitee_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 5) Ranking global abierto ----------
create or replace function global_weekly_ranking(p_limit integer default 20)
returns table (user_id uuid, full_name text, photo_url text, total_steps bigint) as $$
  select
    p.id,
    p.full_name,
    p.photo_url,
    coalesce(sum(s.steps), 0)::bigint as total_steps
  from profiles p
  left join steps_daily s
    on s.user_id = p.id
    and s.day >= date_trunc('week', local_today())::date
  where p.ranking_visible = true
    and (p.id = auth.uid() or not users_blocked(auth.uid(), p.id))
  group by p.id, p.full_name, p.photo_url
  having coalesce(sum(s.steps), 0) > 0
  order by total_steps desc
  limit greatest(1, least(p_limit, 100));
$$ language sql stable security definer set search_path = public;

-- Mi puesto en el ranking global de la semana (sin filas si no aparezco: ranking apagado o sin pasos).
create or replace function my_weekly_rank() returns table (rank_position bigint, total_steps bigint) as $$
  with mine as (
    select coalesce(sum(s.steps), 0)::bigint as total
    from steps_daily s
    where s.user_id = auth.uid() and s.day >= date_trunc('week', local_today())::date
  )
  select 1 + (
           select count(*) from (
             select s.user_id from steps_daily s
             join profiles p on p.id = s.user_id
             where p.ranking_visible = true and s.day >= date_trunc('week', local_today())::date
             group by s.user_id having sum(s.steps) > (select total from mine)
           ) above
         ),
         mine.total
  from mine
  where auth.uid() is not null
    and mine.total > 0
    and coalesce((select ranking_visible from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- ---------- 6) El link de invitación también manda la solicitud de amistad ----------
create or replace function capture_referral(p_referrer_id uuid) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sin sesión';
  end if;
  if p_referrer_id is null or p_referrer_id = v_user_id then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_referrer_id) then
    return;
  end if;
  if exists (select 1 from referrals where referred_user_id = v_user_id) then
    return;
  end if;

  insert into referrals (referrer_user_id, referred_user_id) values (p_referrer_id, v_user_id);
  update profiles set referred_by = p_referrer_id where id = v_user_id and referred_by is null;

  -- La persona que entró con tu link te manda una solicitud de amistad; un fallo acá nunca debe tirar el referido.
  begin
    perform friend_request_core(v_user_id, p_referrer_id);
  exception when others then
    null;
  end;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Permisos ----------
revoke execute on function send_friend_request(uuid), respond_friend_request(uuid, boolean), remove_friend(uuid),
  my_friends(), friend_requests_incoming(), friends_weekly_ranking(), friend_card(uuid),
  invite_friends_to_group(uuid, uuid[]), pending_group_invites(), accept_group_invite(uuid), decline_group_invite(uuid),
  my_weekly_rank() from public, anon;
grant execute on function send_friend_request(uuid), respond_friend_request(uuid, boolean), remove_friend(uuid),
  my_friends(), friend_requests_incoming(), friends_weekly_ranking(), friend_card(uuid),
  invite_friends_to_group(uuid, uuid[]), pending_group_invites(), accept_group_invite(uuid), decline_group_invite(uuid),
  my_weekly_rank() to authenticated;
revoke execute on function global_weekly_ranking(integer), capture_referral(uuid) from public, anon;
grant execute on function global_weekly_ranking(integer), capture_referral(uuid) to authenticated;
