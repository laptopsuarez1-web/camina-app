-- PROPUESTA 0047 (SEC-10): los ayudantes internos y las funciones de trigger dejan de ser ejecutables por authenticated;
-- todo lo que la app usa por rpc sigue andando.
-- Sin la propuesta: los 'permission denied' fallan (_reto_met devuelve los referidos de otra persona).
begin;

do $$
declare
  u uuid; victima uuid; r retos; v integer; fn text; n integer; rec record; promo promotions; adm uuid; ganadores integer; g uuid;
  app_rpcs text[] := array['add_staff', 'admin_resolve_report', 'answer_redemption_followup', 'app_user_count', 'approve_nearby_campaign',
    'benefits_remaining_today', 'business_redeem_counts', 'cancel_expired_redemption', 'capture_referral', 'challenge_progress', 'claim_reto',
    'claim_staff_invite', 'community_weekly_average', 'confirm_redemption_code', 'create_group_challenge', 'decide_promotion', 'draw_promotion',
    'earn_points_from_steps', 'flagged_devices', 'founder_slots_used', 'global_weekly_ranking', 'grant_founder', 'group_member_count', 'is_admin',
    'join_group_challenge', 'join_promotion', 'pending_nearby_campaigns', 'pending_reports', 'points_expiring_soon', 'promotion_winner_names',
    'redeem_benefit', 'regenerate_redemption_code', 'register_device', 'register_push_token', 'reject_nearby_campaign', 'remove_staff',
    'report_content', 'request_nearby_campaign', 'request_plan_change', 'request_promotion', 'reto_progress', 'save_coarse_location',
    'suspicious_referrals', 'user_points_balance'];
begin
  u := tt.mk_user(); victima := tt.mk_user();

  -- ===== Permisos =====
  foreach fn in array array['_reto_met(retos,uuid)', '_reto_period(retos,uuid,integer)', '_promotion_eligible(promotions,uuid)'] loop
    perform tt.t_true('authenticated NO puede ejecutar ' || fn, not has_function_privilege('authenticated', 'public.' || fn, 'execute'));
    perform tt.t_true('anon NO puede ejecutar ' || fn, not has_function_privilege('anon', 'public.' || fn, 'execute'));
    perform tt.t_true('service_role y el dueño SÍ pueden ejecutar ' || fn, has_function_privilege('service_role', 'public.' || fn, 'execute') and has_function_privilege('postgres', 'public.' || fn, 'execute'));
  end loop;

  select count(*) into n
  from (select distinct p.oid from pg_trigger t join pg_proc p on p.oid = t.tgfoid join pg_namespace ns on ns.oid = p.pronamespace
        where not t.tgisinternal and ns.nspname = 'public' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))) x;
  perform tt.t_eq('ninguna función de trigger de public es ejecutable por authenticated ni anon', n, 0);

  -- ===== El ataque: espiar los referidos de otra persona =====
  insert into referrals (referrer_user_id, referred_user_id) values (victima, tt.mk_user()), (victima, tt.mk_user());
  insert into retos (title, description, kind, target, reward_points) values ('Reto espía 47', 'Prueba de fuga de datos', 'referrals', 5, 1) returning * into r;
  perform tt.as_client(u);
  perform tt.t_raises('ataque: _reto_met(reto, víctima) es rechazado', format('select _reto_met(%L::retos, %L)', r::text, victima), 'permission denied');
  perform tt.t_raises('ataque: _reto_period es rechazado', format('select _reto_period(%L::retos, %L, 1)', r::text, victima), 'permission denied');
  perform tt.as_admin();

  -- ===== Lo legítimo: retos y sorteos siguen andando (usan los ayudantes por dentro) =====
  insert into retos (title, description, kind, target, reward_points) values ('Reto referidos 47', 'Dos amigos', 'referrals', 2, 3) returning * into r;
  perform tt.as_client(victima);
  select count(*) into n from reto_progress() where reto_id = r.id and claimable;
  perform tt.t_eq('reto_progress() calcula el avance con los ayudantes cerrados (2 referidos = reto cobrable)', n, 1);
  perform tt.t_as(victima);
  v := claim_reto(r.id);
  perform tt.as_admin();
  perform tt.t_eq('claim_reto() sigue pagando el reto (3 Puntos)', v, 3);
  perform tt.t_eq('... y los Puntos llegan al libro', user_points_balance(victima), 3);

  -- Sorteo: draw_promotion usa _promotion_eligible por dentro.
  adm := tt.mk_user(6000, 'Admin 47'); insert into app_admins (user_id) values (adm);
  perform tt.as_admin();
  insert into businesses (name, category, plan, account_kind, approved) values ('Sponsor 47', 'Eventos', 'primer_paso', 'commerce', true) returning id into g;
  update businesses set approved = true where id = g;
  insert into promotions (business_id, kind, title, description, status, price_bs, starts_at, ends_at, prize, winners_count)
    values (g, 'sorteo', 'Sorteo 47', 'Sorteo de prueba 47', 'approved', 200, now() - interval '3 days', now() - interval '1 day', 'Cena', 1) returning * into promo;
  insert into promotion_entries (promotion_id, user_id) values (promo.id, victima);
  perform tt.as_client(adm);
  select count(*) into ganadores from draw_promotion(promo.id);
  perform tt.as_admin();
  perform tt.t_eq('draw_promotion() sigue sorteando entre quienes cumplen la condición', ganadores, 1);

  -- ===== Triggers: siguen disparándose cuando escribe una persona con sesión =====
  insert into banned_words (word) values ('zzprohibida47') on conflict do nothing;
  perform tt.as_client(u);
  perform tt.t_raises('el trigger de nombre de grupo sigue corriendo (rechaza una palabra prohibida)', format('insert into groups (name, created_by) values (%L, %L)', 'zzprohibida47 grupo', u), 'palabras no permitidas');
  perform tt.as_admin();
  perform tt.as_client(u);
  insert into businesses (owner_user_id, name, category, plan, approved) values (u, 'Negocio 47', 'Café', 'primer_paso', true) returning id into g;
  perform tt.as_admin();
  perform tt.t_eq('el trigger de comercios sigue corriendo (approved forzado a false)', (select approved from businesses where id = g), false);

  -- ===== Regresión: las 44 funciones que la app llama por rpc siguen ejecutables =====
  n := 0;
  foreach fn in array app_rpcs loop
    select count(*) into v from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public' and p.proname = fn and has_function_privilege('authenticated', p.oid, 'execute');
    if v = 0 then n := n + 1; perform tt.t_fail('la app llama por rpc a ' || fn, 'ya no es ejecutable por authenticated o no existe'); end if;
  end loop;
  perform tt.t_eq('las ' || array_length(app_rpcs, 1) || ' funciones que la app llama por rpc siguen ejecutables por authenticated', n, 0);
end $$;

rollback;
