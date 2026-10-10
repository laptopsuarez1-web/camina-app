-- Ranking global y promedio de la comunidad (0006), conteo de usuarios (0039) y conteo de canjes por comercio (0037).
begin;

do $$
declare
  a uuid; b uuid; c uuid; d uuid; e uuid; today date := local_today(); wk date := date_trunc('week', local_today())::date;
  n integer; names text; bz uuid; bz2 uuid; bn uuid; bn2 uuid; i integer; avg_total numeric;
begin
  a := tt.mk_user(6000, 'Ana'); b := tt.mk_user(6000, 'Beto'); c := tt.mk_user(6000, 'Carla'); d := tt.mk_user(6000, 'Oculto'); e := tt.mk_user(6000, 'SinPasos');
  perform tt.seed_steps(a, today, 9000); perform tt.seed_steps(b, today, 12000); perform tt.seed_steps(c, today, 3000);
  perform tt.seed_steps(d, today, 50000);                                   -- no quiere aparecer
  update profiles set ranking_visible = false where id = d;
  perform tt.seed_steps(e, today, 0);                                       -- fila en cero
  perform tt.seed_steps(c, wk - 1, 40000);                                  -- semana pasada: no cuenta

  -- ===== Ranking global =====
  select string_agg(full_name, ',' order by total_steps desc) into names from global_weekly_ranking(20);
  perform tt.t_eq('orden descendente por pasos de la semana, sin ocultos ni gente en cero', names, 'Beto,Ana,Carla');
  select total_steps into n from global_weekly_ranking(20) where full_name = 'Carla';
  perform tt.t_eq('los pasos de la semana pasada no cuentan (el lunes arranca la semana)', n, 3000);
  select count(*) into n from global_weekly_ranking(2);
  perform tt.t_eq('el límite pedido se respeta', n, 2);
  select count(*) into n from global_weekly_ranking(0);
  perform tt.t_eq('límite 0 se trata como 1', n, 1);
  select count(*) into n from global_weekly_ranking(-5);
  perform tt.t_eq('límite negativo se trata como 1', n, 1);
  for i in 1..105 loop perform tt.seed_steps(tt.mk_user(), today, 1000 + i); end loop;
  select count(*) into n from global_weekly_ranking(1000);
  perform tt.t_eq('el límite máximo es 100', n, 100);
  select count(*) into n from global_weekly_ranking();
  perform tt.t_eq('por defecto devuelve 20', n, 20);

  -- Nota: con empates el orden entre iguales no está definido (la consulta ordena solo por total_steps); no se prueba.

  -- ===== Promedio de la comunidad =====
  -- La comunidad completa en una base vacía: se mide aparte con otras personas.
  delete from profiles;
  a := tt.mk_user(); b := tt.mk_user(); c := tt.mk_user();
  perform tt.seed_steps(a, today, 1000); perform tt.seed_steps(b, today, 3000);
  update profiles set ranking_visible = false where id = b;                  -- el promedio incluye a quienes no aparecen en el ranking
  select community_weekly_average() into avg_total;
  perform tt.t_eq('promedio = (1.000 + 3.000) / 2, incluso con quien no aparece en el ranking', avg_total, 2000::numeric);
  perform tt.seed_steps(c, today, 0);
  select community_weekly_average() into avg_total;
  perform tt.t_true('una fila en cero baja el promedio (1.333,33)', round(avg_total, 2) = 1333.33);
  delete from steps_daily;
  select community_weekly_average() into avg_total;
  perform tt.t_eq('sin datos el promedio es 0', avg_total, 0::numeric);

  -- ===== Cantidad de usuarios (el ranking global se muestra recién con más de 1.000) =====
  select app_user_count() into n;
  perform tt.t_eq('app_user_count cuenta los perfiles', n, 3);

  -- ===== Canjes confirmados por comercio: solo aparecen desde 100 =====
  a := tt.mk_user();
  bn := tt.mk_benefit(1);   bz := (select business_id from benefits where id = bn);
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status)
  select a, bn, bz, 1, '123456', now(), 'confirmed' from generate_series(1, 100);
  bn2 := tt.mk_benefit(1);  bz2 := (select business_id from benefits where id = bn2);
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status)
  select a, bn2, bz2, 1, '123456', now(), 'confirmed' from generate_series(1, 99);
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status)
  select a, bn2, bz2, 1, '123456', now(), 'pending' from generate_series(1, 5);
  select count(*), min(total) into n, i from business_redeem_counts();
  perform tt.t_eq('solo el comercio con 100 canjes confirmados figura', n, 1);
  perform tt.t_eq('... con su total exacto', i, 100);
  perform tt.t_eq('... y es el comercio correcto', (select business_id from business_redeem_counts()), bz);
  update redemptions set status = 'cancelled' where business_id = bz and id in (select id from redemptions where business_id = bz limit 1);
  select count(*) into n from business_redeem_counts();
  perform tt.t_eq('con 99 confirmados deja de figurar (los cancelados no cuentan)', n, 0);
end $$;

rollback;
