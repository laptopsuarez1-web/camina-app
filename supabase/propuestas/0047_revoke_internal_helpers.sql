-- PROPUESTA 0047 — Cerrar a los usuarios los ayudantes internos que aceptan "de quién" como parámetro
--
-- Hallazgo: SEC-10 (medio).
-- Qué arregla: la 0034 hace "grant execute on all functions in schema public to authenticated" y solo revoca una lista corta. Quedaron
--   ejecutables por cualquier persona con sesión tres ayudantes internos security definer que aceptan un user_id cualquiera y leen
--   steps_daily / referrals ajenos (saltándose la RLS): _reto_met(reto, usuario) devuelve la racha, los días con meta o la cantidad
--   de referidos de CUALQUIER usuario; _reto_period y _promotion_eligible también aceptan un usuario arbitrario. Con los ids que
--   hoy se filtran (SEC-07) sirve para espiar el avance de otra persona. Además quedaron ejecutables las funciones de trigger.
-- Qué hace: (1) revoca EXECUTE de esas tres funciones a public/anon/authenticated. (2) revoca EXECUTE a public/anon/authenticated de
--   TODAS las funciones de trigger del schema public (se detectan por pg_trigger, así que incluye también las que existan en
--   producción y no estén en el repo, como notify_send_push). Un trigger NO necesita que el usuario tenga EXECUTE para dispararse
--   (Postgres solo lo chequea al CREATE TRIGGER), y las funciones de trigger no se pueden llamar por RPC de todos modos.
-- Impacto en el cliente: ninguno. Los únicos que llaman a los 3 ayudantes son reto_progress(), claim_reto(uuid) y draw_promotion(uuid),
--   los tres security definer con dueño postgres: corren con los permisos del dueño y no dependen del grant de authenticated.
--   grep en apps/mobile/src, apps/partner y supabase/functions: cero usos de _reto_met / _reto_period / _promotion_eligible por rpc,
--   y ninguna vista ni política los referencia. Ninguna de las 44 funciones que la app llama por rpc se toca (la prueba lo verifica).
-- Idempotente: sí.
-- Cómo se revierte:
--   grant execute on function public._reto_met(retos, uuid), public._reto_period(retos, uuid, integer),
--     public._promotion_eligible(promotions, uuid) to authenticated;
--   (y para las de trigger, grant execute on function <nombre>() to authenticated;)
-- A futuro (decisión, no se hace acá): las funciones nuevas siguen naciendo con EXECUTE para authenticated; cada ayudante interno nuevo
--   debe llevar su propio revoke, o se puede cambiar el default con
--   "alter default privileges in schema public revoke execute on functions from authenticated" + grants explícitos (patrón de 0037 y 0039).

revoke execute on function public._reto_met(retos, uuid) from public, anon, authenticated;
revoke execute on function public._reto_period(retos, uuid, integer) from public, anon, authenticated;
revoke execute on function public._promotion_eligible(promotions, uuid) from public, anon, authenticated;

do $$
declare r record;
begin
  for r in
    select distinct p.oid::regprocedure as fn
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
  end loop;
end $$;
