-- PROPUESTA 0044 — Una persona no puede levantarse sola la suspensión ni reescribir la fecha en que aceptó los términos
--
-- Hallazgo: SEC-05 (alto).
-- Qué arregla: la política "profiles: update own" (0001) deja a cada persona actualizar CUALQUIER columna de su propia fila,
--   sin with check ni restricción por columna. Una persona suspendida por moderación (admin_resolve_report 'suspend_user' pone
--   profiles.suspended = true) puede hacer un PATCH {suspended:false} sobre sí misma y revertir la moderación. Apple (1.2) y
--   Google piden poder sacar a usuarios abusivos. También puede reescribir terms_accepted_at.
-- Qué hace: un trigger BEFORE UPDATE (sin "OF columnas", para cubrir también el upsert de PostgREST) que, cuando el que escribe es
--   el rol 'authenticated' o 'anon' (es decir, una petición de la app), deja suspended como estaba y, si ya había una fecha de
--   aceptación de términos, la conserva. Revierte EN SILENCIO (no da error), como protect_founder_fields. La función es SECURITY
--   INVOKER a propósito: así current_user es el rol real que ejecuta el UPDATE. Las funciones security definer
--   (admin_resolve_report, admin_unsuspend_user) corren como su dueño (postgres) y pasan; service_role y el SQL Editor también.
-- Impacto en el cliente: ninguno. terminos.tsx pasa terms_accepted_at de null a un valor (permitido); el upsert de (auth)/perfil.tsx y de
--   oauth.ts no toca esas columnas; editar-perfil.tsx sigue pudiendo cambiar birth_date, nombre, zona, meta, etc. El cliente no escribe
--   'suspended' en ningún lado (grep en apps/mobile/src y apps/partner: solo el panel admin lo lee).
-- Idempotente: sí.
-- Cómo se revierte: drop trigger if exists profiles_moderation_guard on public.profiles; drop function if exists public.guard_profile_moderation();

create or replace function guard_profile_moderation() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.suspended := old.suspended;
    if old.terms_accepted_at is not null then
      new.terms_accepted_at := old.terms_accepted_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_moderation_guard on profiles;
create trigger profiles_moderation_guard
  before update on profiles
  for each row execute function guard_profile_moderation();

-- Es una función de trigger: no necesita que nadie con cuenta tenga EXECUTE para dispararse (ver 0047).
revoke execute on function guard_profile_moderation() from public, anon, authenticated;
