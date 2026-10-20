-- Premios online (0060): cupos totales, códigos propios de 7 días, sin horario, confirmación igual que siempre.
begin;

do $$
declare
  owner uuid; bid uuid; b uuid; u1 uuid; u2 uuid; u3 uuid; red redemptions; r2 redemptions; codes text[] := '{}';
  v_hours integer; rows integer;
begin
  perform tt.as_admin();
  owner := tt.mk_user(); u1 := tt.mk_user(6000, 'Uno'); u2 := tt.mk_user(6000, 'Dos'); u3 := tt.mk_user(6000, 'Tres');
  perform tt.give(u1, 100, 60); perform tt.give(u2, 100, 60); perform tt.give(u3, 100, 60);
  insert into businesses (name, category, plan, approved, owner_user_id, is_virtual, phone)
    values ('Tienda online', 'Tienda Online', 'paso_firme', true, owner, true, '+591 70000000') returning id into bid;
  -- Cupos totales 2, horario imposible (solo "ayer") para comprobar que online lo ignora.
  insert into benefits (business_id, name, type, cost_points, daily_quota, valid_days_mask, valid_from, valid_to, online, online_channel, online_quota)
    values (bid, '10% de descuento', 'descuento', 10, null, 0, '03:00', '03:01', true, 'whatsapp', 2) returning id into b;

  perform tt.t_as(u1);
  red := redeem_benefit(b);
  perform tt.t_true('online: se canjea fuera de horario y días', red.id is not null);
  perform tt.t_eq('online: el código es de 6 números', length(red.code), 6);
  v_hours := extract(epoch from (red.code_expires_at - now()))::integer / 3600;
  perform tt.t_true('online: el código dura 7 días', v_hours between 166 and 168);
  perform tt.t_eq('online: los Puntos se reservan, no se descuentan todavía', user_points_balance(u1), 100);

  perform tt.t_as(u2);
  r2 := redeem_benefit(b);
  perform tt.t_true('online: cada persona recibe un código propio', r2.code <> red.code);

  perform tt.t_as(u3);
  perform tt.t_raises('online: con los cupos totales usados ya no se puede canjear', format('select redeem_benefit(%L)', b), 'Se agotaron los cupones');

  -- Los cupos usados se pueden consultar sin ver canjes ajenos.
  perform tt.t_eq('online: cupos usados', (select redeemed from benefits_online_redeemed() where benefit_id = b), 2);

  -- El local confirma cuando quiere, con el mismo flujo de siempre.
  perform tt.t_as(owner);
  r2 := confirm_redemption_code(bid, red.code);
  perform tt.t_eq('online: el local confirma el código', r2.status::text, 'confirmed');
  perform tt.t_as(u1);
  perform tt.t_eq('online: al confirmar se descuentan los Puntos (-10, +5 por local nuevo)', user_points_balance(u1), 95);

  -- Un canje cancelado libera su cupo.
  perform tt.as_admin();
  update redemptions set status = 'cancelled' where user_id = u2 and benefit_id = b;
  perform tt.t_as(u3);
  red := redeem_benefit(b);
  perform tt.t_true('online: un cupo liberado se puede volver a usar', red.id is not null);

  -- Regenerar renueva por 7 días, no por 15 minutos.
  perform tt.t_as(u3);
  update redemptions set code_expires_at = now() + interval '1 hour' where id = red.id;
  r2 := regenerate_redemption_code(red.id);
  v_hours := extract(epoch from (r2.code_expires_at - now()))::integer / 3600;
  perform tt.t_true('online: regenerar renueva por 7 días', v_hours between 166 and 168);
end $$;

do $$
declare
  bid uuid; b uuid; u uuid; red redemptions; v_min integer;
begin
  -- Un premio común sigue igual: 15 minutos, horario y cupo por día.
  perform tt.as_admin();
  b := tt.mk_benefit(10, 3); u := tt.mk_user(6000, 'Comun');
  perform tt.give(u, 100, 60);
  perform tt.t_as(u);
  red := redeem_benefit(b);
  v_min := extract(epoch from (red.code_expires_at - now()))::integer / 60;
  perform tt.t_true('común: el código sigue durando 15 minutos', v_min between 14 and 15);

  -- Un premio online necesita canal.
  perform tt.as_admin();
  select business_id into bid from benefits where id = b;
  perform tt.t_raises('online sin canal no se guarda',
    format('insert into benefits (business_id, name, type, cost_points, online) values (%L, ''X'', ''gratis'', 10, true)', bid),
    'benefits_online_has_channel');
end $$;

rollback;
