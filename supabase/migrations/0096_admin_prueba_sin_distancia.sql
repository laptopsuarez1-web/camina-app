-- Cuentas admin (app_admins): para probar canjes y visitas de la Ruta sin estar en el local.
-- canjear con el código del local (redeem_with_local_code) y marcar visita en la Ruta (route_mark_visit) exigen estar a
-- pocos metros del local. Para un admin la distancia cuenta como 0. Para el resto de las personas no cambia nada.
-- Sigue pidiendo el código correcto y la ubicación del teléfono (solo se salta "estás lejos").
create or replace function distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns integer
language sql stable
set search_path to 'public'
as $f$
  select case when is_admin() then 0
    else round(2 * 6371000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))::int end;
$f$;
revoke execute on function distance_m(double precision, double precision, double precision, double precision) from public, anon, authenticated;
