-- Panel del local: sección "Ruta del mes" con los números del local.
-- Cuántas personas lo tienen en su Ruta este mes, si es el local protagonista y cuál es el premio del mes.
-- Solo para miembros del local (o admin). Solo números: no expone a nadie.
create or replace function route_business_overview(p_business uuid) returns jsonb as $f$
declare
  v_month date := route_month();
  v_prize route_prizes%rowtype;
begin
  if not (is_business_member(p_business) or is_admin()) then raise exception 'No autorizado'; end if;
  select * into v_prize from route_prizes where month = v_month;
  return jsonb_build_object(
    'month', v_month,
    'in_route', (select count(*) from route_stops where business_id = p_business and month = v_month),
    'visits', (select count(*) from route_visits where business_id = p_business and month = v_month and status = 'confirmed'),
    'is_featured', coalesce(v_prize.sponsor_business_id = p_business, false),
    'prize_title', v_prize.title,
    'prize_detail', v_prize.detail);
end;
$f$ language plpgsql stable security definer set search_path = public;

revoke execute on function route_business_overview(uuid) from public, anon;
grant execute on function route_business_overview(uuid) to authenticated;
