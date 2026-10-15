-- Grupos solo con invitación: cada grupo tiene un código secreto (invite_code) y nadie más lo ve ni se une sin él.
--
-- Antes: cualquier persona con sesión listaba todos los grupos y se unía a cualquiera (SEC-08 / SEC-09 de la auditoría).
-- Ahora:
--   * groups.invite_code: 8 caracteres al azar (sin 0/O/1/I/L), único, se genera solo al crear el grupo.
--   * Solo se leen los grupos propios (miembro o quien lo creó). Se acaba la lista "Grupos para unirte".
--   * Unirse se hace únicamente con las funciones de abajo (security definer); ya no se puede insertar en group_members
--     directo, salvo quien crea el grupo para anotarse él mismo.
-- Idempotente: sí.
-- Cómo se revierte: volver a crear "groups: authenticated read" (using true) y "group_members: self join"
--   (with check auth.uid() = user_id), y borrar las dos funciones y la columna.

create or replace function gen_invite_code() returns text as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from groups where invite_code = code);
  end loop;
  return code;
end;
$$ language plpgsql volatile set search_path = public;

alter table groups add column if not exists invite_code text;
update groups set invite_code = gen_invite_code() where invite_code is null;
alter table groups alter column invite_code set default gen_invite_code();
alter table groups alter column invite_code set not null;
create unique index if not exists groups_invite_code_key on groups (invite_code);

-- Lectura: solo miembros y quien lo creó (is_group_member viene de 0015, security definer).
drop policy if exists "groups: authenticated read" on groups;
drop policy if exists "groups: members read" on groups;
create policy "groups: members read" on groups for select to authenticated
  using (created_by = auth.uid() or is_group_member(id));

-- Insertar en group_members: solo quien creó el grupo, para anotarse él mismo. El resto entra con el código.
drop policy if exists "group_members: self join" on group_members;
create policy "group_members: self join" on group_members for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- Ver a qué grupo invita un código (nombre y cantidad) antes de unirse.
create or replace function group_by_invite_code(p_code text)
returns table (id uuid, name text, member_count integer) as $$
  select g.id, g.name, (select count(*)::int from group_members m where m.group_id = g.id)
  from groups g
  where auth.uid() is not null and g.invite_code = upper(trim(p_code));
$$ language sql stable security definer set search_path = public;

-- Unirse con el código. Devuelve el id del grupo; si el código no existe, devuelve null.
create or replace function join_group_with_code(p_code text) returns uuid as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  select id into v_group from groups where invite_code = upper(trim(p_code));
  if v_group is null then
    return null;
  end if;
  insert into group_members (group_id, user_id) values (v_group, auth.uid())
  on conflict (group_id, user_id) do nothing;
  return v_group;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function group_by_invite_code(text), join_group_with_code(text), gen_invite_code() from public, anon;
grant execute on function group_by_invite_code(text), join_group_with_code(text) to authenticated;
