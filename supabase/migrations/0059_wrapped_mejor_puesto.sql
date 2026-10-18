-- Wrapped del mes (compartir resultados): mejor puesto de la persona en el ranking global semanal de un mes.
-- Solo suma una función de lectura; no hay tablas ni permisos nuevos. Los pasos, los Puntos y la racha del Wrapped
-- salen de las tablas propias de la persona (steps_daily y points_ledger, ya con "select own").
-- Mismo criterio que my_weekly_rank(): solo cuenta quien activó "Aparecer en el ranking" y tuvo pasos esa semana.
-- Semanas lunes a domingo cuyo lunes cae dentro del mes y que ya terminaron. Sin filas = no se muestra esa lámina.
-- Bloques $f$ para poder aplicarlo por la API.

create or replace function my_best_weekly_rank(p_month date)
returns table (week_start date, rank_position bigint, total_steps bigint, participants bigint) as $f$
  with m as (
    select date_trunc('month', p_month)::date as m0
  ),
  weeks as (
    select (w)::date as ws
    from m,
         generate_series(
           m.m0 + ((8 - extract(isodow from m.m0)::int) % 7),
           (m.m0 + interval '1 month')::date - 7,
           interval '7 days'
         ) as w
    where (w)::date + 6 < local_today()
  ),
  totals as (
    select wk.ws, s.user_id, sum(s.steps)::bigint as total
    from weeks wk
    join steps_daily s on s.day between wk.ws and wk.ws + 6
    join profiles p on p.id = s.user_id and p.ranking_visible = true
    group by wk.ws, s.user_id
    having sum(s.steps) > 0
  ),
  mine as (
    select * from totals where user_id = auth.uid()
  )
  select mine.ws,
         1 + (select count(*) from totals t where t.ws = mine.ws and t.total > mine.total),
         mine.total,
         (select count(*) from totals t where t.ws = mine.ws)
  from mine
  where auth.uid() is not null
  order by 2 asc, mine.total desc, mine.ws asc
  limit 1;
$f$ language sql stable security definer set search_path = public;

revoke execute on function my_best_weekly_rank(date) from public, anon;
grant execute on function my_best_weekly_rank(date) to authenticated;
