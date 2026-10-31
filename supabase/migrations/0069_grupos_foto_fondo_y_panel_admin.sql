-- 0069 — Grupos con foto, fondo y meta desde el alta; panel admin: pausar comercios y banear cuentas.
-- (Eliminar/salir del grupo, PR #77, quedó como 0071 para no chocar con multicuentas = 0068.)

-- ---------- Grupos: foto, fondo y meta ----------
alter table groups add column if not exists photo_url text;
alter table groups add column if not exists background text not null default 'aqua';
alter table groups drop constraint if exists groups_background_check;
alter table groups add constraint groups_background_check
  check (background in ('aqua', 'sunset', 'night', 'forest', 'berry', 'sand'));

-- La meta del grupo se elige al crearlo: mismos límites que ya aplica el cambio de meta (0019).
alter table groups drop constraint if exists groups_challenge_target_range;
alter table groups add constraint groups_challenge_target_range
  check (challenge_target between 5000 and 5000000) not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-photos', 'group-photos', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "group-photos: public read" on storage.objects;
create policy "group-photos: public read" on storage.objects for select
  using (bucket_id = 'group-photos');

-- Solo quien creó el grupo sube o cambia la foto (carpeta = id del grupo).
drop policy if exists "group-photos: creator write" on storage.objects;
create policy "group-photos: creator write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-photos'
    and exists (select 1 from groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid())
  );
drop policy if exists "group-photos: creator update" on storage.objects;
create policy "group-photos: creator update" on storage.objects for update to authenticated
  using (
    bucket_id = 'group-photos'
    and exists (select 1 from groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid())
  );
drop policy if exists "group-photos: creator delete" on storage.objects;
create policy "group-photos: creator delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'group-photos'
    and exists (select 1 from groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid())
  );

-- ---------- Comercios: pausar ----------
-- Pausado = desaparece de la app y no se puede canjear, pero no se pierde nada (beneficios, historial, plan).
alter table businesses add column if not exists paused_at timestamptz;
alter table businesses add column if not exists pause_reason text;

drop policy if exists "businesses: public read approved" on businesses;
create policy "businesses: public read approved" on businesses for select
  using ((approved and paused_at is null) or auth.uid() = owner_user_id or is_admin());

drop policy if exists "benefits: public read active" on benefits;
create policy "benefits: public read active" on benefits for select
  using (
    (active and exists (select 1 from businesses b where b.id = business_id and b.approved and b.paused_at is null))
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
    or is_admin()
  );

-- Los canjes los crean funciones security definer que leen "benefits" directo: se frena acá, en un solo lugar.
create or replace function block_redemption_if_paused() returns trigger as $f$
begin
  if exists (select 1 from businesses b where b.id = new.business_id and b.paused_at is not null) then
    raise exception 'Este comercio está en pausa por ahora.';
  end if;
  return new;
end;
$f$ language plpgsql security definer set search_path = public;
revoke execute on function block_redemption_if_paused() from public, anon, authenticated;

drop trigger if exists redemptions_block_paused on redemptions;
create trigger redemptions_block_paused before insert on redemptions
  for each row execute function block_redemption_if_paused();

-- El dueño no puede quitarse la pausa (ni ponérsela a otro): solo el equipo de Camina.
create or replace function enforce_business_privileged_fields() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if not is_admin() then
      new.approved := false;
      new.ad_eligible := false;
      new.plan_started_at := now();
      new.pending_plan := null;
      new.paused_at := null;
      new.pause_reason := null;
      if auth.role() = 'authenticated' then
        new.plan := 'primer_paso';
        new.founder := false;
        new.founder_until := null;
      end if;
    end if;
    return new;
  end if;

  if auth.role() = 'authenticated' and not is_admin() then
    if new.approved is distinct from old.approved then
      raise exception 'La aprobación del comercio la confirma el equipo de Camina.';
    end if;
    if new.ad_eligible is distinct from old.ad_eligible then
      raise exception 'La elegibilidad para espacios publicitarios la define el equipo de Camina.';
    end if;
    new.plan_started_at := old.plan_started_at;
    new.pending_plan := old.pending_plan;
    new.account_kind := old.account_kind;
    new.paused_at := old.paused_at;
    new.pause_reason := old.pause_reason;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_set_business_paused(p_business uuid, p_paused boolean, p_reason text default null)
returns void as $f$
begin
  if not is_admin() then raise exception 'Solo el equipo de Camina puede hacer esto.'; end if;
  update businesses
     set paused_at = case when p_paused then coalesce(paused_at, now()) else null end,
         pause_reason = case when p_paused then nullif(trim(p_reason), '') else null end
   where id = p_business;
  if not found then raise exception 'Comercio no encontrado.'; end if;
end;
$f$ language plpgsql security definer set search_path = public;
grant execute on function admin_set_business_paused(uuid, boolean, text) to authenticated;

-- ---------- Cuentas: baneo ----------
alter table profiles add column if not exists banned_at timestamptz;
alter table profiles add column if not exists ban_reason text;

-- Nadie se levanta solo el baneo (misma regla que "suspended", 0044).
create or replace function guard_profile_moderation() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.suspended := old.suspended;
    new.banned_at := old.banned_at;
    new.ban_reason := old.ban_reason;
    if old.terms_accepted_at is not null then
      new.terms_accepted_at := old.terms_accepted_at;
    end if;
  end if;
  return new;
end;
$$;

-- Buscador de cuentas para el panel (con correo, que vive en auth.users). Solo admins.
create or replace function admin_list_users(p_query text default '', p_limit integer default 50)
returns table (id uuid, full_name text, email text, created_at timestamptz, suspended boolean, banned_at timestamptz, ban_reason text, admin_account boolean, owns_business boolean)
as $f$
  select p.id, p.full_name, u.email::text, p.created_at, p.suspended, p.banned_at, p.ban_reason,
         exists (select 1 from app_admins a where a.user_id = p.id),
         exists (select 1 from businesses b where b.owner_user_id = p.id)
  from profiles p
  join auth.users u on u.id = p.id
  where is_admin()
    and (coalesce(trim(p_query), '') = ''
         or p.full_name ilike '%' || trim(p_query) || '%'
         or u.email ilike '%' || trim(p_query) || '%')
  order by (p.banned_at is not null) desc, p.created_at desc
  limit least(greatest(p_limit, 1), 200);
$f$ language sql stable security definer set search_path = public;
grant execute on function admin_list_users(text, integer) to authenticated;

-- Cortar las sesiones abiertas de una cuenta baneada. Solo la llama la función admin-users (service_role).
create or replace function admin_revoke_sessions(p_user uuid) returns void as $f$
begin
  delete from auth.sessions where user_id = p_user;
end;
$f$ language plpgsql security definer set search_path = public, auth;
revoke execute on function admin_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function admin_revoke_sessions(uuid) to service_role;
