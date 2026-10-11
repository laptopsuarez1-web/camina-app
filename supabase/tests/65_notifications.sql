-- Avisos programados: recordatorio de racha (0018) y "Puntos por vencer" con FIFO (0035).
begin;

do $$
declare
  a uuid; b uuid; c uuid; d uuid; today date := local_today(); n integer; msg text;
begin
  -- ===== Recordatorio de racha =====
  a := tt.mk_user(3000, 'Con racha');  b := tt.mk_user(3000, 'Racha de 1');
  c := tt.mk_user(3000, 'Ya cumplió'); d := tt.mk_user(3000, 'Racha cortada');
  -- a: cumplió ayer y anteayer, hoy todavía no => recibe aviso con "2 días"
  perform tt.seed_steps(a, today - 1, 3000); perform tt.seed_steps(a, today - 2, 4000); perform tt.seed_steps(a, today, 500);
  -- b: solo ayer => racha de 1, no avisa (hace falta al menos 2)
  perform tt.seed_steps(b, today - 1, 3000);
  -- c: racha de 2 pero hoy ya llegó a la meta => no avisa
  perform tt.seed_steps(c, today - 1, 3000); perform tt.seed_steps(c, today - 2, 3000); perform tt.seed_steps(c, today, 3000);
  -- d: cumplió anteayer y hace 3 días pero ayer no => la racha ya se cortó
  perform tt.seed_steps(d, today - 2, 3000); perform tt.seed_steps(d, today - 3, 3000);

  perform queue_streak_reminder_notifications();
  select o.body into msg from notifications_outbox o where o.user_id = a and o.data->>'type' = 'streak_reminder';
  perform tt.t_true('con racha de 2 días y sin meta hoy: avisa con el largo de la racha', msg like 'Llevás 2 días seguidos%');
  select count(*) into n from notifications_outbox where user_id in (b, c, d) and data->>'type' = 'streak_reminder';
  perform tt.t_eq('racha de 1, ya cumplió hoy o racha cortada: no avisa', n, 0);
  perform queue_streak_reminder_notifications();
  select count(*) into n from notifications_outbox o where o.user_id = a and o.data->>'type' = 'streak_reminder';
  perform tt.t_eq('correrlo de nuevo el mismo día no duplica el aviso', n, 1);

  -- BUG de consistencia: el aviso mide la racha con la meta ACTUAL del perfil (p.daily_goal), no con la de cada día
  -- (steps_daily.goal, 0039) como hace la app (useStreak): si alguien sube su meta, el servidor cree que la racha se cortó.
  a := tt.mk_user(6000, 'Subió su meta');
  perform tt.seed_steps(a, today - 1, 3500, 1200, 3000); perform tt.seed_steps(a, today - 2, 3500, 1200, 3000);   -- cumplió 3.000 los dos días
  perform queue_streak_reminder_notifications();
  select count(*) into n from notifications_outbox o where o.user_id = a and o.data->>'type' = 'streak_reminder';
  perform tt.t_xfail_eq('racha real de 2 días (con la meta de entonces): debería avisar aunque hoy la meta sea 6.000', n, 1);

  -- ===== Puntos por vencer (aviso diario, 5 días) =====
  a := tt.mk_user(); b := tt.mk_user(); c := tt.mk_user();
  perform tt.give(a, 8, 3);                                   -- vencen en 3 días
  perform tt.give(b, 8, 3); insert into points_ledger (user_id, amount, reason) values (b, -8, 'redemption');   -- ya los gastó
  perform tt.give(c, 8, 30);                                  -- vencen lejos
  perform queue_expiring_points_notifications();
  select o.body into msg from notifications_outbox o where o.user_id = a and o.data->>'type' = 'points_expiring';
  perform tt.t_true('avisa cuántos Puntos se vencen en los próximos 5 días', msg like 'Tenés 8 Puntos que se vencen%');
  select count(*) into n from notifications_outbox where user_id in (b, c) and data->>'type' = 'points_expiring';
  perform tt.t_eq('no avisa si ya los gastó o si vencen lejos', n, 0);
  perform queue_expiring_points_notifications();
  select count(*) into n from notifications_outbox where user_id = a and data->>'type' = 'points_expiring';
  perform tt.t_eq('no duplica el aviso del día', n, 1);
  d := tt.mk_user(); perform tt.give(d, 1, 2);
  perform queue_expiring_points_notifications();
  select o.body into msg from notifications_outbox o where o.user_id = d and o.data->>'type' = 'points_expiring';
  perform tt.t_true('singular: "1 Punto que se vence"', msg like 'Tenés 1 Punto que se vence%');
end $$;

rollback;
