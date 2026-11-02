-- Tarjeta de fidelidad GENERAL (0080): 5 canjes confirmados en cualquier comercio = un premio gratis a elegir, 30 días para canjearlo.
begin;

do $$
declare
  u uuid; u2 uuid; stranger uuid; owners uuid[] := '{}'; bens uuid[] := '{}'; bizs uuid[] := '{}';
  b uuid; bz uuid; o uuid; red redemptions; c jsonb; i integer; before_bal integer; card_id uuid; ov jsonb;
begin
  u := tt.mk_user(6000, 'Marcos Tapia'); u2 := tt.mk_user(); stranger := tt.mk_user();
  perform tt.give(u, 1000, 60);

  -- Cinco comercios, cada uno con su dueño y su premio.
  for i in 1..5 loop
    o := tt.mk_user(); b := tt.mk_benefit(20, 99);
    select business_id into bz from benefits where id = b;
    update businesses set owner_user_id = o where id = bz;
    update businesses set approved = true where id = bz;
    owners := owners || o; bens := bens || b; bizs := bizs || bz;
  end loop;

  perform tt.t_eq('la tarjeta es de 5 sellos', loyalty_goal(), 5);
  perform tt.t_eq('la tarjeta completa vence a los 30 días', loyalty_card_days(), 30);

  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('la tarjeta nueva está en 0', (c->>'stamps')::int, 0);
  perform tt.t_true('sin tarjeta completa no hay vencimiento', c->>'expires_at' is null);
  perform tt.t_raises('sin tarjeta completa no se elige premio', format('select choose_camina_prize(%L)', bens[1]), 'Todavía no tienes una tarjeta completa');

  -- ===== Sellos: uno por canje confirmado, en cualquier comercio =====
  for i in 1..4 loop
    perform tt.t_as(u); red := redeem_benefit(bens[i]);
    perform tt.t_as(owners[i]); perform confirm_redemption_code(bizs[i], red.code);
    perform tt.t_as(u);
    if i = 1 then
      perform tt.t_eq('un canje pendiente no pone sello, el confirmado sí', (my_camina_card()->>'stamps')::int, 1);
    end if;
  end loop;
  c := my_camina_card();
  perform tt.t_eq('4 canjes en 4 comercios distintos: 4 sellos', (c->>'stamps')::int, 4);
  perform tt.t_eq('el historial guarda dónde canjeó', jsonb_array_length(c->'history'), 4);
  perform tt.t_true('con 4 sellos todavía no hay vencimiento', c->>'completed_at' is null);

  -- El quinto sello completa la tarjeta (en el mismo comercio donde canjeó el primero: pasaron 14 días).
  update redemptions set created_at = created_at - interval '15 days' where user_id = u and business_id = bizs[1];
  perform tt.t_as(u); red := redeem_benefit(bens[1]);
  perform tt.t_as(owners[1]); perform confirm_redemption_code(bizs[1], red.code);
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('5 canjes: tarjeta completa', (c->>'stamps')::int, 5);
  perform tt.t_true('la tarjeta tiene fecha de completada', c->>'completed_at' is not null);
  perform tt.t_true('vence 30 días después de completarse',
    (c->>'expires_at')::timestamptz between (c->>'completed_at')::timestamptz + interval '29 days 23 hours' and (c->>'completed_at')::timestamptz + interval '30 days 1 hour');
  perform tt.t_eq('aparece un aviso de tarjeta completa', (select count(*) from notifications_outbox where user_id = u and data->>'type' = 'camina_card_ready')::int, 1);
  perform tt.t_eq('sin comercios participando no hay premios para elegir', jsonb_array_length(c->'options'), 0);

  -- ===== Los comercios eligen participar =====
  perform tt.t_as(stranger);
  perform tt.t_raises('solo el dueño elige el premio de fidelidad', format('select set_loyalty_benefit(%L, %L)', bizs[1], bens[1]), 'No autorizado');
  for i in 1..3 loop
    perform tt.t_as(owners[i]); perform set_loyalty_benefit(bizs[i], bens[i]);
  end loop;
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('participan 3 comercios: 3 premios para elegir', jsonb_array_length(c->'options'), 3);
  perform tt.t_true('cada premio trae su comercio', (c->'options'->0->'business'->>'name') is not null);

  -- ===== Elegir y cambiar el premio =====
  perform tt.t_raises('no se elige un premio de un comercio que no participa', format('select choose_camina_prize(%L)', bens[4]), 'Ese premio no está disponible');
  perform tt.t_as(u2);
  perform tt.t_raises('otra persona sin tarjeta no puede elegir', format('select choose_camina_prize(%L)', bens[1]), 'Todavía no tienes una tarjeta completa');
  perform tt.t_as(u);
  c := choose_camina_prize(bens[2]);
  perform tt.t_eq('elige su premio', (c->>'chosen_benefit_id')::uuid, bens[2]);
  c := choose_camina_prize(bens[1]);
  perform tt.t_eq('puede cambiarlo mientras no lo canjeó', (c->>'chosen_benefit_id')::uuid, bens[1]);

  -- ===== Canje gratis: 0 Puntos, sin espera aunque haya canjeado ahí hace poco =====
  before_bal := user_points_balance(u);
  perform tt.t_as(u); red := redeem_benefit(bens[1]);
  perform tt.t_eq('el premio de la tarjeta cuesta 0 Puntos', red.cost_points, 0);
  perform tt.t_true('el canje queda marcado como gratis por tarjeta', red.loyalty_free and red.loyalty_card_id is not null);
  perform tt.t_raises('mientras se canjea no se cambia el premio', format('select choose_camina_prize(%L)', bens[2]), 'Ya estás canjeando');
  perform tt.t_as(owners[1]); perform confirm_redemption_code(bizs[1], red.code);
  perform tt.t_as(u);
  perform tt.t_eq('no se descontaron Puntos', user_points_balance(u), before_bal);
  select id into card_id from loyalty_cards where user_id = u;
  perform tt.t_eq('la tarjeta queda usada', (select status from loyalty_cards where id = card_id), 'used');
  c := my_camina_card();
  perform tt.t_eq('la tarjeta vuelve a 0', (c->>'stamps')::int, 0);
  perform tt.t_eq('la tarjeta usada pasa a "anteriores"', jsonb_array_length(c->'past'), 1);
  perform tt.t_eq('... como canjeada', c->'past'->0->>'status', 'used');
  perform tt.t_eq('el canje gratis no cuenta como sello', (select count(*) from redemptions where user_id = u and loyalty_free)::int, 1);

  -- ===== Panel del comercio =====
  perform tt.t_as(owners[1]);
  ov := business_loyalty_overview(bizs[1]);
  perform tt.t_eq('el panel cuenta 1 premio entregado', (ov->>'delivered_total')::int, 1);
  perform tt.t_eq('nadie espera su premio', jsonb_array_length(ov->'waiting'), 0);

  -- ===== Segunda tarjeta: vence sin canjear =====
  perform tt.t_as(u);
  for i in 1..5 loop
    update redemptions set created_at = created_at - interval '15 days' where user_id = u;
    perform tt.t_as(u); red := redeem_benefit(bens[i]);
    perform tt.t_as(owners[i]); perform confirm_redemption_code(bizs[i], red.code);
  end loop;
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('otros 5 canjes: segunda tarjeta completa', (c->>'stamps')::int, 5);
  c := choose_camina_prize(bens[3]);
  perform tt.t_as(owners[3]);
  ov := business_loyalty_overview(bizs[3]);
  perform tt.t_eq('el comercio ve quién eligió su premio', jsonb_array_length(ov->'waiting'), 1);
  perform tt.t_eq('... solo con nombre de pila e inicial', ov->'waiting'->0->>'name', 'Marcos T.');

  -- Aviso a los 7 días.
  update loyalty_cards set expires_at = now() + interval '6 days' where user_id = u and status = 'open';
  perform queue_camina_card_notifications();
  perform queue_camina_card_notifications();
  perform tt.t_eq('avisa que el premio vence (una sola vez)', (select count(*) from notifications_outbox where user_id = u and data->>'type' = 'camina_card_expiring')::int, 1);
  update loyalty_cards set expires_at = now() + interval '1 day' where user_id = u and status = 'open';
  perform queue_camina_card_notifications();
  perform tt.t_eq('avisa de nuevo a los 2 días', (select count(*) from notifications_outbox where user_id = u and data->>'type' = 'camina_card_expiring')::int, 2);

  -- Vence.
  update loyalty_cards set expires_at = now() - interval '1 hour' where user_id = u and status = 'open';
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('vencida: la tarjeta empieza de nuevo', (c->>'stamps')::int, 0);
  perform tt.t_eq('... y queda en "anteriores"', jsonb_array_length(c->'past'), 2);
  perform tt.t_eq('... como vencida', c->'past'->0->>'status', 'expired');
  red := redeem_benefit(bens[3]);
  perform tt.t_eq('una tarjeta vencida no regala nada: el premio sale a su precio', red.cost_points, 20);
  perform tt.t_true('... y no queda marcado como gratis', not red.loyalty_free);

  -- ===== Privilegios =====
  perform tt.t_as(null);
  perform tt.t_raises('sin sesión no hay tarjeta', 'select my_camina_card()', 'No autorizado');
end $$;

rollback;
