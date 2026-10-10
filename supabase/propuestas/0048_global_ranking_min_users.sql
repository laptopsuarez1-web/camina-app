-- PROPUESTA 0048 — El ranking global solo existe en el servidor cuando hay MÁS de 1.000 usuarios (hoy lo decide solo la app)
--
-- Hallazgo: SEC-22 (medio).
-- Qué arregla: la regla aprobada "el ranking global se muestra con más de 1.000 usuarios" la aplica únicamente el cliente
--   (RANKING_MIN_USERS = 1000 en apps/mobile/src/constants/business-rules.ts, useGlobalRankingOpen). El RPC global_weekly_ranking
--   sigue devolviendo nombre, foto y pasos de hasta 100 personas con ranking_visible (que es true por defecto) a cualquiera que
--   tenga sesión, aunque la app no muestre la pantalla. Hoy con 4 perfiles eso expone a todos.
-- Qué hace: recrea global_weekly_ranking con la misma firma y la misma consulta, más una condición: si app_user_count() (0039) no es
--   mayor que 1000, devuelve cero filas. Mismo criterio que el cliente (> 1000, estricto).
-- Impacto en el cliente: ninguno visible. La app ya no pide el ranking global con 1000 usuarios o menos (useGlobalRankingOpen); si lo
--   pidiera, recibe una lista vacía (sin error). community_weekly_average() NO cambia (es solo un número, sin identidades).
--   Con el cambio, las pruebas viejas de 60_ranking.sql que miran el ranking con pocos usuarios dejan de aplicar (ver obsoletas.txt).
-- Idempotente: sí (create or replace; conserva los permisos de la 0034).
-- Cómo se revierte: volver a aplicar global_weekly_ranking de supabase/migrations/0006_terms_global_ranking.sql.
-- Para cambiar el umbral: editar el 1000 de abajo Y RANKING_MIN_USERS en la app (deben coincidir).

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
    and app_user_count() > 1000          -- regla aprobada: ranking global solo con más de 1.000 usuarios (RANKING_MIN_USERS en la app)
  group by p.id, p.full_name, p.photo_url
  having coalesce(sum(s.steps), 0) > 0
  order by total_steps desc
  limit greatest(1, least(p_limit, 100));
$$ language sql stable security definer set search_path = public;
