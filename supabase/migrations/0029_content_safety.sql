-- Seguridad de contenido: nombres limpios, tamaño de grupos y límites de fotos ---------------

-- ¿El texto está libre de palabras prohibidas?
create or replace function text_is_clean(p_text text) returns boolean as $$
  select not exists (
    select 1 from banned_words w
    where translate(lower(coalesce(p_text, '')), 'áéíóúüñ', 'aeiouun') ~ ('(^|[^a-z0-9])' || w.word || '([^a-z0-9]|$)')
  );
$$ language sql stable security definer set search_path = public;

create or replace function guard_group_name() returns trigger as $$
begin
  if not text_is_clean(new.name) then
    raise exception 'El nombre del grupo tiene palabras no permitidas.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists groups_name_guard on groups;
create trigger groups_name_guard before insert or update of name on groups for each row execute function guard_group_name();

create or replace function guard_profile_name() returns trigger as $$
begin
  if not text_is_clean(new.full_name) then
    raise exception 'Ese nombre tiene palabras no permitidas. Usá tu nombre real.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists profiles_name_guard on profiles;
create trigger profiles_name_guard before insert or update of full_name on profiles for each row execute function guard_profile_name();

-- Máximo 50 personas por grupo.
create or replace function guard_group_size() returns trigger as $$
begin
  if (select count(*) from group_members where group_id = new.group_id) >= 50 then
    raise exception 'Este grupo ya tiene el máximo de 50 personas.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
drop trigger if exists group_members_size_guard on group_members;
create trigger group_members_size_guard before insert on group_members for each row execute function guard_group_size();

-- Fotos: solo imágenes y hasta 5 MB.
update storage.buckets
   set file_size_limit = 5 * 1024 * 1024, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('avatars', 'business-logos', 'benefit-images');
