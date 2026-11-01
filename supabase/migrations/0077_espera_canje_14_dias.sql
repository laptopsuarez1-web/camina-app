-- 0077 — Espera entre canjes en un mismo comercio: de 7 a 14 días (una vez cada dos semanas).
-- Todas las versiones de redeem_benefit y my_loyalty_cards leen esta función, así que alcanza con cambiarla.
-- Los canjes ya hechos cuentan igual: la espera se mide desde la fecha de cada canje.
-- Se revierte: volver a `select 7`.

create or replace function business_redemption_cooldown_days() returns integer
language sql immutable set search_path = public
as $f$ select 14 $f$;
