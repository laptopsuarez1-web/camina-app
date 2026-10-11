-- PROPUESTA 0050 (SEC-25): todas las funciones de public fijan su search_path; el comportamiento no cambia.
-- Sin la propuesta: la lista de funciones sin search_path fijo trae las 12 del hallazgo.
begin;

do $$
declare
  n integer; lista text; u uuid; b uuid;
begin
  select count(*), string_agg(p.proname, ', ' order by p.proname) into n, lista
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.prokind = 'f'
    and p.proname <> 'rls_auto_enable'          -- la instala Supabase en cada proyecto (en esta base de prueba la pone 00_shim.sql)
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
  perform tt.t_eq('ninguna función de public queda sin search_path fijo (excepto rls_auto_enable, de Supabase)', n, 0);
  if n > 0 then raise notice 'INFO|sin search_path: %', lista; end if;

  -- ===== El comportamiento no cambia =====
  perform tt.t_eq('daily_points_cap() sigue valiendo 20', daily_points_cap(), 20);
  perform tt.t_eq('points_ttl_days() sigue valiendo 90', points_ttl_days(), 90);
  perform tt.t_eq('business_redemption_cooldown_days() sigue valiendo 14', business_redemption_cooldown_days(), 14);
  perform tt.t_eq('redemption_code_ttl_minutes() sigue valiendo 15', redemption_code_ttl_minutes(), 15);
  perform tt.t_eq('local_today() sigue siendo la fecha de La Paz', local_today(), (now() at time zone 'America/La_Paz')::date);
  perform tt.t_true('generate_redemption_code() sigue dando 6 dígitos', generate_redemption_code() ~ '^[0-9]{6}$');
  perform tt.t_eq('plan_rank(paso_firme) = 1', plan_rank('paso_firme'), 1);
  perform tt.t_eq('promotion_price(events_only) = 400', promotion_price('events_only'), 400);

  u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 20, 60); perform tt.t_as(u);
  perform redeem_benefit(b);
  perform tt.t_eq('user_points_balance() sigue calculando el saldo (20 - 5)', user_points_balance(u), 15);
  perform tt.t_eq('points_earned_today() sigue andando', points_earned_today(u), 0);
  perform tt.seed_steps(u, local_today(), 0);
  perform earn_points_from_steps(u, local_today(), 3000);
  perform tt.t_eq('earn_points_from_steps sigue acreditando (3.000 pasos = 3 Puntos)', tt.steps_pts(u, local_today()), 3);
end $$;

rollback;
