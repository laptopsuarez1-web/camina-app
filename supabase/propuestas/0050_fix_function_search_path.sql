-- PROPUESTA 0050 — Fijar el search_path de las 12 funciones que lo tienen suelto
--
-- Hallazgo: SEC-25 (bajo; advisor "function_search_path_mutable" de Supabase).
-- Qué arregla: 12 funciones de public no fijan su search_path. Ninguna es security definer y anon/authenticated no pueden crear
--   objetos en public (has_schema_privilege CREATE = false), así que hoy no es explotable, pero el advisor lo marca y una función
--   nueva security definer que las llame heredaría el problema.
-- Qué hace: alter function ... set search_path = public en cada una. No cambia ni el cuerpo ni los permisos. (rls_auto_enable() es
--   de Supabase y no se toca.)
-- Impacto en el cliente: ninguno. Efecto lateral mínimo: Postgres deja de "inlinear" las funciones SQL de una línea (por ejemplo
--   local_today(), daily_points_cap()); a esta escala la diferencia es imperceptible.
-- Idempotente: sí.
-- Cómo se revierte: alter function <cada una> reset search_path;

alter function public.business_redemption_cooldown_days() set search_path = public;
alter function public.clamp_daily_steps() set search_path = public;
alter function public.daily_points_cap() set search_path = public;
alter function public.enforce_benefit_plan_rules() set search_path = public;
alter function public.generate_redemption_code() set search_path = public;
alter function public.local_today() set search_path = public;
alter function public.plan_rank(business_plan) set search_path = public;
alter function public.points_earned_today(uuid) set search_path = public;
alter function public.points_ttl_days() set search_path = public;
alter function public.promotion_price(text) set search_path = public;
alter function public.redemption_code_ttl_minutes() set search_path = public;
alter function public.user_points_balance(uuid) set search_path = public;
