-- Permisos de funciones (0034): sin sesión (anon) no se ejecuta nada; las tareas internas no las corre nadie con cuenta.
begin;

do $$
declare
  fn text; n integer; u uuid; v integer; r retos;
begin
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute');
  perform tt.t_eq('anon (sin sesión) no puede ejecutar ninguna función de public', n, 0);

  foreach fn in array array[
    'earn_points_from_steps(uuid,date,integer)', 'redeem_benefit(uuid)', 'cancel_expired_redemption(uuid)',
    'regenerate_redemption_code(uuid)', 'confirm_redemption_code(uuid,text)', 'claim_reto(uuid)', 'reto_progress()',
    'user_points_balance(uuid)', 'points_expiring_soon(integer)', 'challenge_progress(uuid)', 'join_group_challenge(uuid)',
    'create_group_challenge(uuid,text,text,integer,date,date,integer)', 'global_weekly_ranking(integer)',
    'community_weekly_average()', 'business_redeem_counts()', 'app_user_count()', 'benefits_remaining_today()'
  ] loop
    perform tt.t_true('authenticated puede ejecutar ' || fn, has_function_privilege('authenticated', fn, 'execute'));
  end loop;

  foreach fn in array array[
    'settle_group_challenges()', 'close_group_week(date)', 'weekly_group_maintenance()',
    'queue_expiring_points_notifications()', 'queue_expiring_redemption_notifications()', 'queue_streak_reminder_notifications()',
    'points_expiring_for(uuid,integer)', 'queue_notification(uuid,text,text,jsonb,text)',
    'end_founder_periods()', 'apply_pending_plan_downgrades()'
  ] loop
    perform tt.t_true('authenticated NO puede ejecutar la tarea interna ' || fn, not has_function_privilege('authenticated', fn, 'execute'));
  end loop;

  -- Una persona logueada no puede disparar la liquidación de desafíos ni el cierre semanal.
  u := tt.mk_user();
  perform tt.as_client(u);
  perform tt.t_raises('authenticated: settle_group_challenges() es rechazada', 'select settle_group_challenges()', 'permission denied');
  perform tt.t_raises('authenticated: close_group_week() es rechazada', 'select close_group_week(current_date)', 'permission denied');
  perform tt.as_admin();

  -- BUG: helpers internos que reciben un user_id arbitrario quedaron ejecutables por cualquier persona logueada
  -- (0034 abre TODO en public a authenticated y solo cierra una lista corta). Permiten espiar el avance de otro usuario.
  perform tt.t_xfail_true('_reto_met(reto, usuario) no debería ser ejecutable por authenticated', not has_function_privilege('authenticated', '_reto_met(retos,uuid)', 'execute'), 'devuelve referidos / racha / metas de CUALQUIER usuario');
  perform tt.t_xfail_true('_reto_period(reto, usuario, n) no debería ser ejecutable por authenticated', not has_function_privilege('authenticated', '_reto_period(retos,uuid,integer)', 'execute'));
  perform tt.t_xfail_true('_promotion_eligible(promo, usuario) no debería ser ejecutable por authenticated', not has_function_privilege('authenticated', '_promotion_eligible(promotions,uuid)', 'execute'));
  -- Demostración de la fuga: u mira los referidos de otra persona.
  declare victim uuid := tt.mk_user(); begin
    insert into referrals (referrer_user_id, referred_user_id) values (victim, tt.mk_user()), (victim, tt.mk_user());
    insert into retos (title, description, kind, target, reward_points) values ('Reto espía', 'Prueba de fuga de datos', 'referrals', 5, 1) returning * into r;
    perform tt.as_client(u);
    begin
      execute format('select _reto_met(%L::retos, %L)', r::text, victim) into v;
    exception when others then v := null;
    end;
    perform tt.as_admin();
    perform tt.t_xfail_true('una persona logueada no debería poder leer los referidos de otra con _reto_met', v is distinct from 2, format('_reto_met devolvió %s', v));
  end;
end $$;

rollback;
