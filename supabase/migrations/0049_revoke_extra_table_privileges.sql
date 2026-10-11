-- PROPUESTA 0049 — Quitarles a anon y authenticated los permisos de sobra sobre las tablas (TRUNCATE, REFERENCES, TRIGGER)
--
-- Hallazgo: SEC-24 (bajo).
-- Qué arregla: anon y authenticated tienen ALL en todas las tablas de public (Supabase los otorga por defecto), incluidos TRUNCATE,
--   REFERENCES y TRIGGER. Hoy solo protege la RLS; PostgREST no expone TRUNCATE y no se puede explotar por la API, pero es superficie
--   de sobra (por ejemplo has_table_privilege('authenticated','public.points_ledger','TRUNCATE') da true). En Postgres 17 también
--   existe MAINTAIN (VACUUM/ANALYZE/REINDEX...), que se quita igual.
-- Qué hace: revoca TRUNCATE, REFERENCES y TRIGGER (y MAINTAIN si el servidor es Postgres 17 o más) sobre TODAS las tablas y vistas
--   existentes de public a anon y authenticated, y repite el cambio de permisos por defecto para las tablas futuras (ya lo hace la
--   0040 con una lista más larga; acá queda por si se aplica esta sin la 0040). No toca SELECT/INSERT/UPDATE/DELETE: la RLS y las
--   políticas siguen mandando como hasta ahora.
-- Impacto en el cliente: ninguno. PostgREST nunca usa TRUNCATE/REFERENCES/TRIGGER; las claves foráneas y los triggers se verifican/disparan con
--   los permisos del dueño de la tabla, no de quien escribe (la prueba lo verifica escribiendo con tablas que tienen FK y triggers).
-- Idempotente: sí.
-- Cómo se revierte: grant truncate, references, trigger on all tables in schema public to anon, authenticated;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on all tables in schema public from anon, authenticated';
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated';
  end if;
end $$;
