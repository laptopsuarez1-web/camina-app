-- Desafíos de grupo con Puntos en juego (0030, 0031, 0033): crear, sumarse, avance en vivo y reparto al terminar.
begin;

do $$
declare
  g uuid; a uuid; b uuid; c uuid; outsider uuid; ch uuid; today date := local_today();
  r record; n integer; bal integer; pot integer; st text;
begin
  insert into groups (name) values ('Grupo desafío') returning id into g;
  a := tt.mk_user(); b := tt.mk_user(); c := tt.mk_user(); outsider := tt.mk_user();
  insert into group_members (group_id, user_id) values (g, a), (g, b), (g, c);
  perform tt.give(a, 30, 60); perform tt.give(b, 30, 60); perform tt.give(c, 30, 60);

  -- ===== Crear =====
  perform tt.t_as(outsider);
  perform tt.t_raises('quien no es del grupo no puede crear', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 5)', g, 'Mi desafío', 'steps', today + 1, today + 5), 'No autorizado');
  perform tt.t_as(a);
  perform tt.t_raises('la fecha de inicio no puede ser pasada', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 5)', g, 'Mi desafío', 'steps', today - 1, today + 5), 'La fecha de inicio ya pasó');
  perform tt.t_raises('no alcanzan los Puntos para poner en juego', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 50)', g, 'Mi desafío', 'steps', today + 1, today + 5), 'No te alcanzan los puntos');
  perform tt.t_raises('el nombre debe tener 3 a 30 letras', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 5)', g, 'Hi', 'steps', today + 1, today + 5), 'group_challenges_name_check');
  perform tt.t_raises('la meta mínima del desafío es 1.000', format('select create_group_challenge(%L, %L, %L, 999, %L, %L, 5)', g, 'Mi desafío', 'steps', today + 1, today + 5), 'group_challenges_daily_goal_check');
  perform tt.t_raises('dura como máximo 14 días', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 5)', g, 'Mi desafío', 'steps', today + 1, today + 15), 'group_challenges_check');
  perform tt.t_raises('no se pueden poner Puntos negativos', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, -5)', g, 'Mi desafío', 'steps', today + 1, today + 5), 'group_challenges_stake_check');
  perform tt.give(a, 100, 60);                                                                       -- con saldo de sobra, el tope de la puesta es 50
  perform tt.t_raises('la puesta máxima es 50', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 51)', g, 'Mi desafío', 'steps', today + 1, today + 5), 'group_challenges_stake_check');
  delete from points_ledger where user_id = a and amount = 100;
  ch := create_group_challenge(g, 'Mi desafío', 'steps', 5000, today + 1, today + 5, 10);
  perform tt.t_eq('crear descuenta la puesta del creador', user_points_balance(a), 20);
  select * into r from points_ledger where user_id = a and amount < 0;
  perform tt.t_eq('la nota dice dónde puso', r.note, 'Pusiste en «Mi desafío»');
  perform tt.t_eq('el creador queda anotado con su puesta', (select stake_paid from group_challenge_entries where challenge_id = ch and user_id = a), 10);
  perform tt.t_raises('un solo desafío activo por grupo', format('select create_group_challenge(%L, %L, %L, 5000, %L, %L, 0)', g, 'Otro desafío', 'days', today + 1, today + 3), 'ya tiene un desafío en marcha');
  select count(*) into n from notifications_outbox where data->>'type' = 'group_challenge' and user_id in (b, c);
  perform tt.t_eq('se avisa a los otros miembros', n, 2);

  -- ===== Sumarse =====
  perform tt.t_as(outsider);
  perform tt.t_raises('quien no es del grupo no puede sumarse', format('select join_group_challenge(%L)', ch), 'No autorizado');
  perform tt.t_as(b);
  perform join_group_challenge(ch);
  perform tt.t_eq('sumarse descuenta la puesta (30 - 10)', user_points_balance(b), 20);
  perform join_group_challenge(ch);
  perform tt.t_eq('sumarse dos veces no cobra dos veces', user_points_balance(b), 20);
  update group_challenges set start_day = today - 1, end_day = today + 3 where id = ch;
  perform tt.t_as(c);
  perform tt.t_raises('una vez empezado ya no se puede sumar', format('select join_group_challenge(%L)', ch), 'Ya no se puede sumar');
  update group_challenges set start_day = today where id = ch;
  perform join_group_challenge(ch);
  perform tt.t_pass('el mismo día de inicio todavía se puede sumar');
  -- sin Puntos suficientes
  update group_challenges set stake = 50 where id = ch;
  delete from group_challenge_entries where challenge_id = ch and user_id = c;
  delete from points_ledger where user_id = c and amount < 0;
  perform tt.t_raises('sin Puntos suficientes no se suma', format('select join_group_challenge(%L)', ch), 'No te alcanzan los puntos');
  update group_challenges set stake = 10 where id = ch;
  perform join_group_challenge(ch);

  -- ===== Avance en vivo (challenge_progress) =====
  -- Desafío ya empezado: 5 días terminados ayer; meta 5.000/día; regla 'steps'. Se arma directo para controlar las fechas.
  update group_challenges set status = 'finished' where id = ch;
  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (g, a, 'Semana pasada', 'steps', 5000, today - 5, today - 1, 10) returning id into ch;
  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (ch, a, 10), (ch, b, 10), (ch, c, 5);
  -- a: 5 de 5 días; b: ok ok no ok ok (4 de 5, mejor racha 2); c: 3 de 5.
  for n in 0..4 loop perform tt.seed_steps(a, today - 5 + n, 7000 + n * 10, 1200); end loop;
  for n in 0..4 loop perform tt.seed_steps(b, today - 5 + n, case when n = 2 then 100 else 5000 end, 1200); end loop;
  for n in 0..4 loop perform tt.seed_steps(c, today - 5 + n, case when n in (0, 1, 4) then 5000 else 0 end, 1200); end loop;

  perform tt.t_as(outsider);
  select count(*) into n from challenge_progress(ch);
  perform tt.t_eq('quien no es del grupo no ve el avance', n, 0);
  perform tt.t_as(a);
  select * into r from challenge_progress(ch) where user_id = a;
  perform tt.t_eq('a: pasos totales', r.steps, 35100);
  perform tt.t_eq('a: 5 días con meta', r.goal_days, 5);
  perform tt.t_eq('a: mejor racha 5', r.best_streak, 5);
  perform tt.t_eq('a: cumple el 80%', r.met_goal, true);
  select * into r from challenge_progress(ch) where user_id = b;
  perform tt.t_eq('b: 4 días con meta', r.goal_days, 4);
  perform tt.t_eq('b: mejor racha 2 (el hueco corta)', r.best_streak, 2);
  perform tt.t_eq('b: 4 de 5 = 80% justo: cumple', r.met_goal, true);
  select * into r from challenge_progress(ch) where user_id = c;
  perform tt.t_eq('c: 3 días con meta', r.goal_days, 3);
  perform tt.t_eq('c: 3 de 5 no llega al 80%', r.met_goal, false);
  perform tt.t_eq('c: mejor racha 2 (días 0 y 1)', r.best_streak, 2);

  -- ===== Reparto al terminar (settle_group_challenges) =====
  -- Puesta total 10 + 10 + 5 = 25; ganan a y b: 12 cada uno y el sobrante (1) para quien quedó primero.
  perform tt.t_as(null);
  select user_points_balance(a) into bal;
  n := settle_group_challenges();
  perform tt.t_eq('se liquida 1 desafío vencido', n, 1);
  select * into r from group_challenge_results where challenge_id = ch and user_id = a;
  perform tt.t_eq('a: puesto 1', r.rank, 1);
  perform tt.t_eq('a: cobra 13 (12 + sobrante de 1)', r.payout, 13);
  select * into r from group_challenge_results where challenge_id = ch and user_id = b;
  perform tt.t_eq('b: cobra 12', r.payout, 12);
  select * into r from group_challenge_results where challenge_id = ch and user_id = c;
  perform tt.t_eq('c: no cumplió, cobra 0', r.payout, 0);
  select sum(payout) into pot from group_challenge_results where challenge_id = ch;
  perform tt.t_eq('se reparte exactamente la puesta total (25)', pot, 25);
  select * into r from points_ledger where user_id = a and note like 'Ganaste%';
  perform tt.t_eq('el asiento del premio', r.amount, 13);
  perform tt.t_true('el premio vence a los 90 días', r.expires_at = now() + interval '90 days');
  select status into st from group_challenges where id = ch;
  perform tt.t_eq('el desafío queda terminado', st, 'finished');
  perform tt.t_eq('segunda corrida: no se liquida otra vez', settle_group_challenges(), 0);
  select count(*) into n from points_ledger where note like 'Ganaste%';
  perform tt.t_eq('segunda corrida: no se paga dos veces', n, 2);
  select count(*) into n from notifications_outbox where data->>'type' = 'group_challenge_end';
  perform tt.t_eq('se avisa a los tres participantes', n, 3);

  -- Un desafío que termina hoy todavía no se liquida (end_day < hoy).
  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (g, a, 'Termina hoy', 'days', 1000, today - 2, today, 0) returning id into ch;
  perform tt.t_eq('un desafío que termina hoy no se liquida todavía', settle_group_challenges(), 0);
  update group_challenges set status = 'finished' where id = ch;

  -- Nadie cumple: cada uno recupera lo que puso.
  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (g, a, 'Nadie llega', 'steps', 60000, today - 3, today - 1, 10) returning id into ch;
  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (ch, a, 10), (ch, b, 7);
  insert into points_ledger (user_id, amount, reason) values (a, -10, 'challenge'), (b, -7, 'challenge');
  select user_points_balance(a), user_points_balance(b) into bal, n;
  perform settle_group_challenges();
  perform tt.t_eq('nadie cumple: a recupera 10', user_points_balance(a) - bal, 10);
  perform tt.t_eq('nadie cumple: b recupera 7', user_points_balance(b) - n, 7);
  select count(*) into n from points_ledger where note like 'Te devolvimos lo que pusiste%';
  perform tt.t_eq('nadie cumple: dos devoluciones con su nota', n, 2);
  select sum(payout) into pot from group_challenge_results where challenge_id = ch;
  perform tt.t_eq('nadie cumple: los resultados registran premio 0', pot, 0);

  -- Un solo ganador se lleva todo el pozo.
  update group_challenges set status = 'finished' where group_id = g;
  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (g, a, 'Uno gana', 'days', 20000, today - 2, today - 1, 10) returning id into ch;
  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (ch, a, 10), (ch, b, 10), (ch, c, 10);
  perform tt.seed_steps(a, today - 2, 25000, 1200); perform tt.seed_steps(a, today - 1, 25000, 1200);
  perform settle_group_challenges();
  select payout into n from group_challenge_results where challenge_id = ch and user_id = a;
  perform tt.t_eq('un solo ganador se lleva el pozo completo (30)', n, 30);
end $$;

rollback;
