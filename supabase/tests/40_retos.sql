-- Retos (0024, 0033): reto_progress / claim_reto con los tres tipos: referrals, steps_streak y weekly_goals.
begin;

do $$
declare
  u uuid; u2 uuid; rid uuid; r record; led record; n integer; res integer; st text;
  today date := local_today();
  wk date := date_trunc('week', local_today())::date;          -- lunes de esta semana (La Paz)
  i integer;
begin
  -- ===== weekly_goals: días de ESTA semana (lunes a hoy) que llegaron a la meta =====
  insert into retos (title, description, kind, target, reward_points) values ('Meta semanal de prueba', 'Prueba de metas de la semana', 'weekly_goals', 1, 6) returning id into rid;
  u := tt.mk_user(3000); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 2999, 1200, 3000);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('2.999 pasos con meta 3.000: avance 0', r.met, 0);
  perform tt.t_eq('... y no se puede cobrar', r.claimable, false);
  perform tt.t_raises('cobrar sin cumplir', format('select claim_reto(%L)', rid), 'Todavía no completaste este reto');
  update steps_daily set steps = 3000 where user_id = u and day = today;
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('3.000 pasos con meta 3.000: avance 1', r.met, 1);
  perform tt.t_eq('... y se puede cobrar', r.claimable, true);

  -- Un día de la semana pasada no cuenta (el domingo anterior, aunque llegó a la meta).
  u2 := tt.mk_user(3000); perform tt.t_as(u2);
  perform tt.seed_steps(u2, wk - 1, 9000, 1200, 3000);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('el domingo de la semana pasada no suma a esta semana', r.met, 0);

  perform tt.t_as(u);
  res := claim_reto(rid);
  perform tt.t_eq('cobrar devuelve los Puntos del reto', res, 6);
  select * into led from points_ledger where user_id = u and reason = 'challenge';
  perform tt.t_eq('el asiento suma los Puntos del reto', led.amount, 6);
  perform tt.t_eq('la nota dice "Reto: nombre"', led.note, 'Reto: Meta semanal de prueba');
  perform tt.t_true('los Puntos del reto vencen a los 90 días', led.expires_at = now() + interval '90 days');
  perform tt.t_raises('no se cobra dos veces en la semana', format('select claim_reto(%L)', rid), 'Ya cobraste este reto');
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('tras cobrar: figura cobrado esta semana', r.claimed_now, true);
  perform tt.t_eq('tras cobrar: ya no es cobrable', r.claimable, false);
  perform tt.t_eq('el saldo incluye el premio', user_points_balance(u), 6);

  -- Reto inactivo / sin sesión.
  update retos set active = false where id = rid;
  perform tt.t_raises('reto inactivo', format('select claim_reto(%L)', rid), 'Ese reto no está disponible');
  perform tt.t_as(null);
  perform tt.t_raises('sin sesión no se cobra', format('select claim_reto(%L)', rid), 'No autorizado');
  perform tt.t_raises('sin sesión no se ve el avance', 'select * from reto_progress()', 'No autorizado');
  update retos set active = true where id = rid;

  -- BUG: la meta con la que se evalúa cada día es la ACTUAL del perfil, no la que tenía ese día (0039 la guarda en steps_daily.goal).
  -- Si alguien baja su meta a 1.000, los días que no había cumplido pasan a contar y cobra el reto. (Necesita un día
  -- anterior de esta misma semana: los lunes no se puede probar.)
  if today > wk then
    u := tt.mk_user(1000); perform tt.t_as(u);
    perform tt.seed_steps(u, today - 1, 2000, 1200, 6000);    -- ayer: meta de entonces 6.000, hizo 2.000 => NO cumplió
    perform tt.seed_steps(u, today, 0, 1200, 1000);
    select * into r from reto_progress() where reto_id = rid;
    perform tt.t_xfail_eq('ayer no cumplió su meta de entonces (2.000 < 6.000): no debería sumar aunque hoy la meta sea 1.000', r.met, 0);
    u := tt.mk_user(6000); perform tt.t_as(u);
    perform tt.seed_steps(u, today - 1, 2000, 1200, 1000);    -- ayer: meta de entonces 1.000, hizo 2.000 => SÍ cumplió
    perform tt.seed_steps(u, today, 0, 1200, 6000);
    select * into r from reto_progress() where reto_id = rid;
    perform tt.t_xfail_eq('ayer sí cumplió su meta de entonces (2.000 >= 1.000): debería sumar aunque hoy la meta sea 6.000', r.met, 1);
  else
    perform tt.t_skip('metas de la semana con meta histórica distinta', 'hoy es lunes: no hay un día anterior en la semana (ver 45_group_week.sql, que sí lo prueba con una semana pasada)');
  end if;

  -- ===== steps_streak: N días seguidos con X pasos, terminando hoy o ayer =====
  insert into retos (title, description, kind, target, steps_threshold, reward_points) values ('Racha de prueba', 'Prueba de racha de pasos', 'steps_streak', 3, 5000, 10) returning id into rid;
  u := tt.mk_user(); perform tt.t_as(u);
  for i in 1..3 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('3 días seguidos terminando ayer: avance 3 (hoy todavía no corta la racha)', r.met, 3);
  perform tt.t_eq('... y se puede cobrar', r.claimable, true);
  perform tt.seed_steps(u, today, 9000);
  perform tt.seed_steps(u, today - 4, 9000);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('el avance se corta en la meta del reto (3), no cuenta de más', r.met, 3);

  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 5000); perform tt.seed_steps(u, today - 2, 5000);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('un hueco ayer corta la racha: avance 1 (solo hoy)', r.met, 1);
  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today - 1, 4999); perform tt.seed_steps(u, today - 2, 5000);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('4.999 pasos no llegan al umbral de 5.000: avance 0', r.met, 0);
  u := tt.mk_user(); perform tt.t_as(u);
  perform tt.seed_steps(u, today, 100); for i in 1..3 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('hoy en curso (100 pasos) no rompe una racha que viene de ayer', r.met, 3);

  u := tt.mk_user(); perform tt.t_as(u);
  for i in 1..3 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  res := claim_reto(rid);
  perform tt.t_eq('cobrar la racha da 10 Puntos', res, 10);
  perform tt.t_raises('no se cobra de nuevo mientras dure la ventana de 3 días', format('select claim_reto(%L)', rid), 'Ya cobraste este reto');
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('racha cobrada: figura cobrada y no cobrable', r.claimed_now and not r.claimable, true);
  -- Pasados 3 días del cobro se puede volver a completar (período distinto).
  update reto_claims set claimed_at = now() - interval '3 days 1 minute', period = 'racha:' || (today - 4) where reto_id = rid and user_id = u;
  res := claim_reto(rid);
  perform tt.t_eq('después de la ventana se puede cobrar otra vez', res, 10);
  select count(*) into n from reto_claims where reto_id = rid and user_id = u;
  perform tt.t_eq('quedan dos cobros registrados', n, 2);

  -- ===== referrals: cada N amigos se cobra una vez =====
  insert into retos (title, description, kind, target, reward_points) values ('Invitar de prueba', 'Prueba de invitaciones', 'referrals', 2, 10) returning id into rid;
  u := tt.mk_user(); perform tt.t_as(u);
  insert into referrals (referrer_user_id, referred_user_id) values (u, tt.mk_user());
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('1 de 2 amigos: avance 1, no cobrable', r.met * 10 + case when r.claimable then 1 else 0 end, 10);
  perform tt.t_raises('faltan amigos', format('select claim_reto(%L)', rid), 'Todavía te faltan amigos');
  insert into referrals (referrer_user_id, referred_user_id) values (u, tt.mk_user());
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('2 de 2 amigos: cobrable', r.claimable, true);
  res := claim_reto(rid);
  perform tt.t_eq('cobrar el primer grupo de 2 da 10 Puntos', res, 10);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('después de cobrar, el avance vuelve a 0 de 2', r.met, 0);
  perform tt.t_eq('... y no es cobrable', r.claimable, false);
  perform tt.t_raises('con los mismos 2 amigos no se cobra otra vez', format('select claim_reto(%L)', rid), 'Todavía te faltan amigos');
  insert into referrals (referrer_user_id, referred_user_id) values (u, tt.mk_user());
  insert into referrals (referrer_user_id, referred_user_id) values (u, tt.mk_user());
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('4 amigos en total: se puede cobrar el segundo grupo', r.claimable, true);
  res := claim_reto(rid);
  select count(*) into n from reto_claims where reto_id = rid and user_id = u;
  perform tt.t_eq('segundo grupo cobrado (2 cobros)', n, 2);
  select string_agg(period, ',' order by period) into st from reto_claims where reto_id = rid and user_id = u;
  perform tt.t_eq('los períodos son grupo:1 y grupo:2', st, 'grupo:1,grupo:2');

  -- Caracterización: hoy el reto cuenta TODOS los referidos, también los que nunca ganaron Puntos
  -- (referrals.credited = false). Los 5 Puntos por referido sí exigen que el referido camine; el reto no.
  u := tt.mk_user(); perform tt.t_as(u);
  insert into referrals (referrer_user_id, referred_user_id, credited) values (u, tt.mk_user(), false), (u, tt.mk_user(), false);
  select * into r from reto_progress() where reto_id = rid;
  perform tt.t_eq('CARACTERIZACIÓN: 2 referidos sin Puntos ya alcanzan para cobrar el reto', r.claimable, true);
end $$;

rollback;
