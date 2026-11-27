-- Ruta del mes: tampoco entran los locales de belleza, peluquería/barbería, artes marciales y fisioterapia
-- (rubros donde la gente no va "de paso"). Se suma a la lista de 0084; route_eligible ya la usa en
-- armar la ruta, cambiar local y elegir protagonista, así que la validación queda en el servidor.
create or replace function route_excluded_category(p_category text) returns boolean as $f$
  select coalesce(lower(p_category), '') in (
    'gimnasio & deporte', 'yoga & pilates', 'fitness', 'deporte', 'deportes', 'gimnasio',
    'tienda online', 'óptica', 'joyería & relojería', 'tecnología', 'lavandería'
  ) or coalesce(lower(p_category), '') ~ '(artes marciales|fisioterap|kinesi|barber|peluquer|belleza|estética|estetica|manicur|uñas|masaje)';
$f$ language sql immutable set search_path = public;
