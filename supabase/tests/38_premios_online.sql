-- Premios online (0060): cupos totales, códigos propios de 7 días, días y horarios, confirmación igual que siempre y cupones propios de la tienda (canal web).
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
  -- Cupos totales 2, todos los días y a toda hora.
  insert into benefits (business_id, name, type, cost_points, daily_quota, online, online_channel, online_quota)
    values (bid, '10% de descuento', 'descuento', 10, null, true, 'whatsapp', 2) returning id into b;

  perform tt.t_as(u1);
  red := redeem_benefit(b);
  perform tt.t_true('online: se canjea', red.id is not null);
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
  perform tt.t_eq('online: sin cupones propios no hay conteo de cupones', (select codes_left from benefits_online_redeemed() where benefit_id = b), null::integer);

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
  owner uuid; other uuid; bid uuid; b uuid; u1 uuid; u2 uuid; u3 uuid; red redemptions; r2 redemptions; n integer;
begin
  -- ===== Online con cupones propios de la tienda (canal web) =====
  perform tt.as_admin();
  owner := tt.mk_user(); other := tt.mk_user(); u1 := tt.mk_user(6000, 'Uno'); u2 := tt.mk_user(6000, 'Dos'); u3 := tt.mk_user(6000, 'Tres');
  perform tt.give(u1, 100, 60); perform tt.give(u2, 100, 60); perform tt.give(u3, 100, 60);
  insert into businesses (name, category, plan, approved, owner_user_id, is_virtual, website)
    values ('Tienda web', 'Tienda Online', 'paso_firme', true, owner, true, 'https://tienda.test') returning id into bid;
  insert into benefits (business_id, name, type, cost_points, daily_quota, online, online_channel)
    values (bid, '15% OFF', 'descuento', 10, null, true, 'web') returning id into b;
  insert into benefit_codes (benefit_id, code) values (b, 'AMIGO15'), (b, 'CAMINA15');

  perform tt.t_eq('web: dos cupones sin usar', (select codes_left from benefits_online_redeemed() where benefit_id = b), 2);

  perform tt.t_as(u1);
  red := redeem_benefit(b);
  perform tt.t_true('web: la persona recibe un cupón de la tienda', red.code in ('AMIGO15', 'CAMINA15'));
  perform tt.t_eq('web: el canje queda confirmado al instante', red.status::text, 'confirmed');
  perform tt.t_eq('web: los Puntos se descuentan al canjear', user_points_balance(u1), 90);

  perform tt.t_as(u2);
  r2 := redeem_benefit(b);
  perform tt.t_true('web: la segunda persona recibe otro cupón distinto', r2.code in ('AMIGO15', 'CAMINA15') and r2.code <> red.code);
  perform tt.t_as(u3);
  perform tt.t_raises('web: sin cupones ya no se puede canjear', format('select redeem_benefit(%L)', b), 'Se agotaron los cupones');
  perform tt.t_eq('web: no se cobraron Puntos al que no recibió cupón', user_points_balance(u3), 100);
  perform tt.t_eq('web: cupones sin usar', (select codes_left from benefits_online_redeemed() where benefit_id = b), 0);

  -- Solo el local ve los cupones; no se pueden borrar los ya entregados.
  perform tt.as_client(u1);
  select count(*) into n from benefit_codes;
  perform tt.t_eq('web: una persona común no ve los cupones de la tienda', n, 0);
  perform tt.as_admin();
  perform tt.as_client(other);
  select count(*) into n from benefit_codes;
  perform tt.t_eq('web: otro local tampoco los ve', n, 0);
  perform tt.as_admin();
  perform tt.as_client(owner);
  select count(*) into n from benefit_codes;
  perform tt.t_eq('web: el local ve sus cupones', n, 2);
  delete from benefit_codes where benefit_id = b;
  select count(*) into n from benefit_codes;
  perform tt.t_eq('web: no puede borrar los cupones ya entregados', n, 2);
  insert into benefit_codes (benefit_id, code) values (b, 'NUEVO15');
  select count(*) into n from benefit_codes where redemption_id is null;
  perform tt.t_eq('web: el local puede cargar más cupones', n, 1);
  delete from benefit_codes where code = 'NUEVO15';
  select count(*) into n from benefit_codes where redemption_id is null;
  perform tt.t_eq('web: y borrar los que no se usaron', n, 0);
  perform tt.as_admin();
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

  -- Un premio online respeta sus días y horarios.
  perform tt.as_admin();
  select business_id into bid from benefits where id = b;
  insert into benefits (business_id, name, type, cost_points, daily_quota, online, online_channel, online_quota, valid_days_mask)
    values (bid, 'Online sin días', 'gratis', 10, null, true, 'whatsapp', 5, 0) returning id into b;
  perform tt.t_as(u);
  perform tt.t_raises('online: respeta los días del premio', format('select redeem_benefit(%L)', b), 'no está disponible hoy');

  -- Un premio online necesita canal.
  perform tt.as_admin();
  select business_id into bid from benefits where id = b;
  perform tt.t_raises('online sin canal no se guarda',
    format('insert into benefits (business_id, name, type, cost_points, online) values (%L, ''X'', ''gratis'', 10, true)', bid),
    'benefits_online_has_channel');
end $$;

rollback;
