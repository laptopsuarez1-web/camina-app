-- PROPUESTA 0053 (UXC-46): el aviso de racha dice "No cortes" (voseo correcto) y todo lo demás queda igual.
-- Sin la propuesta: el título dice "No cortés" y la comprobación falla.
begin;

do $$
declare
  a uuid; b uuid; c uuid; today date := local_today(); n integer; t text; msg text; k text;
begin
  a := tt.mk_user(3000, 'Con racha'); b := tt.mk_user(3000, 'Racha de 1'); c := tt.mk_user(3000, 'Ya cumplió');
  perform tt.seed_steps(a, today - 1, 3000); perform tt.seed_steps(a, today - 2, 4000); perform tt.seed_steps(a, today, 500);
  perform tt.seed_steps(b, today - 1, 3000);
  perform tt.seed_steps(c, today - 1, 3000); perform tt.seed_steps(c, today - 2, 3000); perform tt.seed_steps(c, today, 3000);

  perform queue_streak_reminder_notifications();
  select o.title, o.body, o.dedupe_key into t, msg, k from notifications_outbox o where o.user_id = a and o.data->>'type' = 'streak_reminder';
  perform tt.t_eq('el título es "¡No cortes tu racha! 🔥"', t, '¡No cortes tu racha! 🔥');
  perform tt.t_true('el título ya no tiene el error "cortés"', t not like '%cortés%');
  perform tt.t_eq('el cuerpo no cambia', msg, 'Llevás 2 días seguidos cumpliendo tu meta. Una caminatita más y la mantenés.');
  perform tt.t_eq('la clave anti-duplicado no cambia', k, 'streak_reminder:' || a || ':' || (now() at time zone 'America/La_Paz')::date);
  select count(*) into n from notifications_outbox where user_id in (b, c) and data->>'type' = 'streak_reminder';
  perform tt.t_eq('racha de 1 o ya cumplió hoy: no avisa (igual que antes)', n, 0);
  perform queue_streak_reminder_notifications();
  select count(*) into n from notifications_outbox o where o.user_id = a and o.data->>'type' = 'streak_reminder';
  perform tt.t_eq('correrlo de nuevo el mismo día no duplica el aviso', n, 1);
  perform tt.t_true('authenticated sigue sin poder ejecutar la tarea interna', not has_function_privilege('authenticated', 'queue_streak_reminder_notifications()', 'execute'));
  perform tt.t_true('anon tampoco', not has_function_privilege('anon', 'queue_streak_reminder_notifications()', 'execute'));
end $$;

rollback;
