-- Tarjeta de fidelidad por local (0057): sellos, canje gratis, planes de pago, panel y espera de 14 días.
begin;

do $$
declare
  u uuid; u2 uuid; owner uuid; stranger uuid; b uuid; b2 uuid; bz uuid; red redemptions; r2 redemptions;
  c record; n integer; ov jsonb; i integer;
begin
  -- ===== Armado: local Paso Firme con su premio de fidelidad =====
  owner := tt.mk_user(); stranger := tt.mk_user(); u := tt.mk_user(6000, 'Marcos Tapia'); b := tt.mk_benefit(20, 99);
  perform tt.give(u, 500, 60);
  select business_id into bz from benefits where id = b;
  update businesses set owner_user_id = owner where id = bz;
  insert into benefits (business_id, name, type, cost_points, daily_quota) values (bz, 'Otro premio', 'gratis', 30, 99) returning id into b2;

  perform tt.t_eq('la espera entre canjes en un mismo local es de 14 días', business_redemption_cooldown_days(), 14);
  perform tt.t_eq('la tarjeta es de 5 sellos', loyalty_goal(), 5);

  perform tt.t_as(u);
  perform tt.t_eq('sin premio elegido no hay tarjeta', (select count(*) from my_loyalty_cards(bz))::int, 0);

  perform tt.t_as(stranger);
  perform tt.t_raises('solo el dueño elige el premio', format('select set_loyalty_benefit(%L, %L)', bz, b), 'No autorizado');
  perform tt.t_as(owner);
  perform tt.t_raises('el premio tiene que ser del local', format('select set_loyalty_benefit(%L, %L)', bz, tt.mk_benefit(5)), 'Ese premio no está disponible');
  perform set_loyalty_benefit(bz, b);
  perform tt.t_eq('el local elige su premio de fidelidad', (select loyalty_benefit_id from businesses where id = bz), b);

  -- ===== Sellos: uno por canje confirmado, no por canje pendiente =====
  perform tt.t_as(u);
  select * into c from my_loyalty_cards(bz);
  perform tt.t_eq('la tarjeta nueva está en 0', c.stamps, 0);
  perform tt.t_eq('la meta es 5', c.goal, 5);
  perform tt.t_eq('todavía no está lista', c.ready, false);
  perform tt.t_eq('la tarjeta nueva no aparece en "mis tarjetas" (sin sellos)', (select count(*) from my_loyalty_cards())::int, 0);

  red := redeem_benefit(b);
  perform tt.t_eq('un canje pendiente no pone sello', (select stamps from my_loyalty_cards(bz)), 0);
  perform tt.t_as(owner); perform confirm_redemption_code(bz, red.code);
  perform tt.t_as(u);
  perform tt.t_eq('al confirmar el local, hay 1 sello', (select stamps from my_loyalty_cards(bz)), 1);
  perform tt.t_eq('con un sello aparece en "mis tarjetas"', (select count(*) from my_loyalty_cards())::int, 1);
  perform tt.t_eq('el historial guarda la fecha del canje', (select cardinality(history) from my_loyalty_cards(bz)), 1);
  perform tt.t_true('próximo canje permitido a los 14 días', (select next_allowed_at from my_loyalty_cards(bz)) between now() + interval '13 days 23 hours' and now() + interval '14 days 1 hour');
  perform tt.t_raises('dentro de los 14 días no se vuelve a canjear', format('select redeem_benefit(%L)', b), 'hace menos de 14 días');

  for i in 2..5 loop
    update redemptions set created_at = created_at - interval '15 days' where user_id = u;
    perform tt.t_as(u); red := redeem_benefit(b);
    perform tt.t_as(owner); perform confirm_redemption_code(bz, red.code);
  end loop;
  perform tt.t_as(u);
  select * into c from my_loyalty_cards(bz);
  perform tt.t_eq('5 canjes confirmados: 5 sellos', c.stamps, 5);
  perform tt.t_eq('la tarjeta está lista', c.ready, true);
  perform tt.t_eq('se cobraron los 5 canjes (500 - 5 × 20 + 5 de bono por local nuevo)', user_points_balance(u), 405);

  -- ===== Premio gratis: 0 Puntos, la tarjeta vuelve a cero =====
  update redemptions set created_at = created_at - interval '15 days' where user_id = u;
  red := redeem_benefit(b2);
  perform tt.t_eq('otro premio del local con la tarjeta completa cuesta lo normal', red.cost_points, 30);
  perform tt.t_eq('y no es gratis de tarjeta', red.loyalty_free, false);
  update redemptions set status = 'cancelled' where id = red.id;

  red := redeem_benefit(b);
  perform tt.t_eq('el premio de fidelidad sale gratis', red.cost_points, 0);
  perform tt.t_eq('queda marcado como gratis de tarjeta', red.loyalty_free, true);
  perform tt.t_eq('mientras está pendiente la tarjeta ya volvió a cero', (select stamps from my_loyalty_cards(bz)), 0);
  perform tt.t_as(owner); r2 := confirm_redemption_code(bz, red.code);
  perform tt.t_as(u);
  perform tt.t_eq('confirmar el canje gratis no mueve Puntos', user_points_balance(u), 405);
  select count(*) into n from points_ledger where user_id = u and amount = 0;
  perform tt.t_eq('y no deja un asiento en 0', n, 0);
  perform tt.t_eq('el canje gratis no cuenta como sello', (select stamps from my_loyalty_cards(bz)), 0);

  -- ===== Si el código gratis vence, la tarjeta vuelve a estar completa =====
  update redemptions set created_at = created_at - interval '15 days' where user_id = u;
  update redemptions set status = 'expired', confirmed_at = null where id = r2.id;
  perform tt.t_eq('un canje gratis vencido devuelve la tarjeta completa', (select stamps from my_loyalty_cards(bz)), 5);

  -- ===== Panel del comercio =====
  perform tt.t_as(stranger);
  perform tt.t_raises('un extraño no ve el resumen', format('select business_loyalty_overview(%L)', bz), 'No autorizado');
  perform tt.t_as(owner);
  ov := business_loyalty_overview(bz);
  perform tt.t_eq('el panel reconoce el plan', (ov->>'plan_ok')::boolean, true);
  perform tt.t_eq('el panel cuenta 1 cliente con tarjeta', (ov->>'customers')::int, 1);
  perform tt.t_eq('el panel cuenta 1 tarjeta completa sin usar', (ov->>'ready_unused')::int, 1);
  perform tt.t_eq('el panel muestra solo nombre de pila e inicial', ov->'close'->0->>'name', 'Marcos T.');
  perform tt.t_true('el panel no devuelve teléfonos ni correos', not (ov::text ~* '@|phone|email'));

  -- ===== Solo planes de pago =====
  perform tt.t_as(null);   -- el cambio de plan lo hace el equipo de Camina (no un cliente)
  update businesses set plan = 'primer_paso' where id = bz;
  perform tt.t_as(u);
  perform tt.t_eq('Primer Paso: la tarjeta se apaga', (select count(*) from my_loyalty_cards(bz))::int, 0);
  perform tt.t_as(owner);
  perform tt.t_eq('Primer Paso: el panel avisa que no corresponde', (business_loyalty_overview(bz)->>'plan_ok')::boolean, false);
  perform tt.t_raises('Primer Paso: no se puede elegir premio', format('select set_loyalty_benefit(%L, %L)', bz, b), 'Paso Firme');
  perform tt.t_as(null);
  update businesses set plan = 'paso_adelante' where id = bz;
  perform tt.t_as(u);
  perform tt.t_eq('Paso Adelante: la tarjeta funciona', (select stamps from my_loyalty_cards(bz)), 5);

  -- ===== Otra persona, tarjeta propia y completa sin pasar por el premio =====
  u2 := tt.mk_user(); perform tt.give(u2, 100, 60);
  perform tt.t_as(u2);
  perform tt.t_eq('cada persona tiene su propia tarjeta', (select stamps from my_loyalty_cards(bz)), 0);

  -- ===== Subida ×1,25 de premios: una sola vez =====
  perform tt.t_true('la subida de premios queda marcada para no repetirse', exists (select 1 from app_config where key = 'points_scale_2_5'));
end $$;

rollback;
