-- PROPUESTA 0040 — Cerrar la escritura sobre la vista public_profiles (y que las vistas/tablas nuevas no nazcan abiertas)
--
-- Hallazgo: SEC-01 (crítico).
-- Qué arregla: public_profiles es una vista simple ("select id, full_name, photo_url from profiles") que pertenece a
--   postgres (que se salta la RLS). Postgres deja escribir a través de una vista simple, y 'authenticated' conserva
--   INSERT/UPDATE/DELETE sobre ella (los permisos por defecto de Supabase en el schema public). Resultado: cualquier
--   persona con sesión puede cambiarle el nombre/foto a cualquier otra, o borrarle el perfil (y el borrado arrastra
--   Puntos, pasos, canjes, grupos y tokens de aviso), saltándose la RLS de "profiles".
-- Qué hace: le saca todos los permisos a anon y authenticated sobre la vista y le devuelve solo SELECT a authenticated
--   (anon ya no tenía SELECT desde la 0034). Además cambia los permisos por defecto del schema public para que una tabla o
--   vista creada de ahora en adelante NO nazca con escritura abierta para anon/authenticated.
-- NO usa security_invoker: "profiles" solo deja leer el perfil propio y se rompería el ranking de grupos, que necesita
--   nombre y foto de los demás miembros.
-- Impacto en el cliente: ninguno. La app solo hace .select() sobre public_profiles (useGroupDetail, useGroupRanking,
--   useMyGroupsWeek, useModeration). service_role y postgres conservan sus permisos.
--   Para MIGRACIONES FUTURAS: una tabla nueva ya no trae INSERT/UPDATE/DELETE para authenticated; si el cliente tiene que
--   escribirla, la migración debe incluir el 'grant insert, update, delete on ... to authenticated' explícito.
-- Idempotente: sí (revoke/grant/alter default privileges se pueden repetir).
-- Cómo se revierte (NO recomendado, reabre el agujero):
--   grant insert, update, delete, truncate, references, trigger on public.public_profiles to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant insert, update, delete, truncate, references, trigger on tables to anon, authenticated;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- Las tablas/vistas futuras nacen solo con SELECT para anon/authenticated (el resto se otorga a propósito, tabla por tabla).
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- Postgres 17 (la versión de producción) agrega el permiso MAINTAIN (VACUUM/ANALYZE/REINDEX...); en 16 no existe esa palabra.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated';
    execute 'revoke maintain on public.public_profiles from anon, authenticated';
  end if;
end $$;
