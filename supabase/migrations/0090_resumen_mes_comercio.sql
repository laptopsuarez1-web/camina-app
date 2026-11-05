-- Resumen del mes para el panel del comercio: cuánta gente le trajo Camina este mes y cómo le fue contra el mes pasado.
-- Solo lo ve quien es del comercio. Cuenta canjes confirmados y visitas de la Ruta confirmadas (las dos traen gente
-- al local); "nuevos" = personas que nunca habían venido antes por Camina.
create or replace function business_month_summary(p_business uuid, p_month date default null) returns jsonb as $f$
declare
  m date := coalesce(date_trunc('month', p_month)::date, route_month());
  prev date := (coalesce(date_trunc('month', p_month)::date, route_month()) - interval '1 month')::date;
begin
  if not is_business_member(p_business) then raise exception 'No autorizado'; end if;
  return (
    with v as (  -- cada venida al local por Camina: canje o visita de la Ruta, confirmados
      select user_id, coalesce(confirmed_at, created_at) as at, 'canje' as kind, extra_consumption as extra
        from redemptions where business_id = p_business and status = 'confirmed'
      union all
      select user_id, coalesce(decided_at, created_at), 'ruta', true
        from route_visits where business_id = p_business and status = 'confirmed'
    ),
    vm as (select *, date_trunc('month', at at time zone 'America/La_Paz')::date as mon from v),
    firsts as (select user_id, min(mon) as first_mon from vm group by user_id),
    cur as (select * from vm where mon = m),
    lvl as (select user_id, sum(points)::int pts from business_level_points where business_id = p_business group by user_id)
    select jsonb_build_object(
      'month', m,
      'canjes', (select count(*) from cur where kind = 'canje'),
      'canjes_prev', (select count(*) from vm where mon = prev and kind = 'canje'),
      'ruta', (select count(*) from cur where kind = 'ruta'),
      'ruta_prev', (select count(*) from vm where mon = prev and kind = 'ruta'),
      -- A cuántas personas les tocó este local en su Ruta del mes (todavía pueden venir).
      'en_rutas', (select count(*) from route_stops where business_id = p_business and month = m),
      'personas', (select count(distinct user_id) from cur),
      'personas_prev', (select count(distinct user_id) from vm where mon = prev),
      'nuevos', (select count(*) from firsts where first_mon = m),
      'volvieron', (select count(distinct c.user_id) from cur c join firsts f on f.user_id = c.user_id where f.first_mon < m),
      'compraron_extra', (select count(*) from cur where kind = 'canje' and extra is true),
      'calificaciones', (select count(*) from business_level_points where business_id = p_business and source = 'resena'
                          and date_trunc('month', created_at at time zone 'America/La_Paz')::date = m),
      'historias', (select count(*) from business_level_points where business_id = p_business and source = 'historia'
                     and date_trunc('month', created_at at time zone 'America/La_Paz')::date = m),
      'favoritos', (select count(*) from favorite_businesses where business_id = p_business),
      'favoritos_mes', (select count(*) from favorite_businesses where business_id = p_business
                         and date_trunc('month', created_at at time zone 'America/La_Paz')::date = m),
      'habituales', (select count(*) from lvl where pts >= 10 and pts < 20),
      'fans', (select count(*) from lvl where pts >= 20),
      -- Día de la semana con más venidas (1 = lunes … 7 = domingo); null si no hubo.
      'mejor_dia', (select extract(isodow from at at time zone 'America/La_Paz')::int from cur
                    group by 1 order by count(*) desc, 1 limit 1),
      'mejor_hora', (select extract(hour from at at time zone 'America/La_Paz')::int from cur
                     group by 1 order by count(*) desc, 1 limit 1)
    )
  );
end;
$f$ language plpgsql stable security definer set search_path = public;

revoke execute on function business_month_summary(uuid, date) from public, anon;
grant execute on function business_month_summary(uuid, date) to authenticated;
