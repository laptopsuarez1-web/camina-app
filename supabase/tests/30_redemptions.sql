-- Canjes con código y vencimiento (0001, 0003, 0026, 0033): redeem_benefit, regenerate_redemption_code,
-- confirm_redemption_code, cancel_expired_redemption, cooldown de 7 días por comercio y cupo diario.
begin;

do $$
declare
  u uuid; u2 uuid; owner uuid; other uuid; b uuid; bz uuid; red redemptions; r2 redemptions; led record; n integer;
  lt time := (now() at time zone 'America/La_Paz')::time;
  dow integer := extract(isodow from (now() at time zone 'America/La_Paz'))::int - 1;
  st text; n_sweepers integer;
begin
  -- ===== Canje feliz =====
  u := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 25, 60); perform tt.t_as(u);
  red := redeem_benefit(b);
  perform tt.t_eq('el canje queda pendiente', red.status::text, 'pending');
  perform tt.t_eq('el canje guarda el costo', red.cost_points, 10);
  perform tt.t_true('el código tiene 6 dígitos', red.code ~ '^[0-9]{6}$');
  perform tt.t_true('el código vence a los 15 minutos', red.code_expires_at = now() + interval '15 minutes');
  perform tt.t_eq('se descuentan los Puntos (25 - 10)', user_points_balance(u), 15);
  select * into led from points_ledger where user_id = u and amount < 0;
  perform tt.t_eq('el asiento del canje es de motivo redemption', led.reason::text, 'redemption');
  perform tt.t_true('la nota nombra al comercio', led.note like 'Canje en Comercio %');

  -- ===== Validaciones =====
  u := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 9, 60); perform tt.t_as(u);
  perform tt.t_raises('saldo insuficiente (9 de 10)', format('select redeem_benefit(%L)', b), 'Saldo insuficiente');
  select count(*) into n from redemptions where user_id = u;
  perform tt.t_eq('un canje rechazado no deja redención ni asiento', n + (select count(*) from points_ledger where user_id = u and amount < 0)::int, 0);
  perform tt.give(u, 1, 60);
  perform redeem_benefit(b);
  perform tt.t_eq('con justo 10 alcanza (saldo exacto)', user_points_balance(u), 0);

  perform tt.t_as(null);
  perform tt.t_raises('sin sesión no se puede canjear', format('select redeem_benefit(%L)', b), 'No autorizado');

  u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 50, 60); perform tt.t_as(u);
  update benefits set active = false where id = b;
  perform tt.t_raises('beneficio inactivo', format('select redeem_benefit(%L)', b), 'Beneficio no disponible');
  perform tt.t_raises('beneficio inexistente', format('select redeem_benefit(%L)', gen_random_uuid()), 'Beneficio no disponible');

  -- ===== Días de la semana (hora de La Paz) =====
  b := tt.mk_benefit(5);
  update benefits set valid_days_mask = 127 & ~(1 << dow) where id = b;
  perform tt.t_raises('hoy no es un día válido del beneficio', format('select redeem_benefit(%L)', b), 'no está disponible hoy');
  update benefits set valid_days_mask = (1 << dow) where id = b;
  perform redeem_benefit(b);
  perform tt.t_pass('solo hoy es válido y se puede canjear');

  -- ===== Horario (hora de La Paz), incluye ventanas que cruzan medianoche =====
  u := tt.mk_user(); perform tt.give(u, 50, 60); perform tt.t_as(u);
  b := tt.mk_benefit(5);
  update benefits set valid_from = lt - interval '1 hour', valid_to = lt + interval '1 hour' where id = b;
  perform redeem_benefit(b);
  perform tt.t_pass('dentro del horario se puede canjear');
  b := tt.mk_benefit(5);
  update benefits set valid_from = lt + interval '1 hour', valid_to = lt + interval '2 hours' where id = b;
  perform tt.t_raises('fuera del horario no se puede canjear', format('select redeem_benefit(%L)', b), 'no está disponible en este horario');
  b := tt.mk_benefit(5);
  update benefits set valid_from = lt + interval '2 hours', valid_to = lt - interval '2 hours' where id = b;   -- ventana "de noche": ahora queda adentro del hueco
  perform tt.t_raises('ventana nocturna: ahora cae en el hueco', format('select redeem_benefit(%L)', b), 'no está disponible en este horario');
  b := tt.mk_benefit(5);
  update benefits set valid_from = lt - interval '2 hours', valid_to = lt - interval '3 hours' where id = b;   -- cruza medianoche y ahora está adentro
  perform redeem_benefit(b);
  perform tt.t_pass('ventana nocturna: ahora cae adentro');

  -- ===== Cooldown de 7 días por comercio =====
  u := tt.mk_user(); b := tt.mk_benefit(5, 99); perform tt.give(u, 100, 60); perform tt.t_as(u);
  select business_id into bz from benefits where id = b;
  red := redeem_benefit(b);
  perform tt.t_raises('segundo canje en el mismo comercio', format('select redeem_benefit(%L)', b), 'Ya canjeaste en este comercio hace menos de 7 días');
  update redemptions set created_at = now() - interval '6 days' where id = red.id;
  perform tt.t_raises('6 días después sigue bloqueado', format('select redeem_benefit(%L)', b), 'hace menos de 7 días');
  update redemptions set created_at = now() - interval '8 days' where id = red.id;
  perform redeem_benefit(b);
  perform tt.t_pass('8 días después se puede volver a canjear');
  -- otro beneficio del MISMO comercio también está bloqueado; de otro comercio no.
  insert into benefits (business_id, name, type, cost_points, daily_quota) values (bz, 'Otro del mismo comercio', 'gratis', 5, 5) returning id into b;
  perform tt.t_raises('otro beneficio del mismo comercio también cuenta', format('select redeem_benefit(%L)', b), 'hace menos de 7 días');
  perform redeem_benefit(tt.mk_benefit(5));
  perform tt.t_pass('otro comercio no está bloqueado');

  -- Estados que no bloquean: cancelado y vencido; confirmado sí.
  u := tt.mk_user(); b := tt.mk_benefit(5, 99); perform tt.give(u, 100, 60); perform tt.t_as(u);
  select business_id into bz from benefits where id = b;
  red := redeem_benefit(b);
  update redemptions set status = 'cancelled' where id = red.id;
  perform redeem_benefit(b);
  perform tt.t_pass('un canje cancelado libera el cooldown');
  update redemptions set status = 'expired' where user_id = u;
  perform redeem_benefit(b);
  perform tt.t_pass('un canje vencido libera el cooldown');
  update redemptions set status = 'confirmed' where user_id = u and status = 'pending';
  perform tt.t_raises('un canje confirmado sí bloquea', format('select redeem_benefit(%L)', b), 'hace menos de 7 días');

  -- ===== Cupo diario =====
  b := tt.mk_benefit(5, 1); u := tt.mk_user(); u2 := tt.mk_user(); perform tt.give(u, 20, 60); perform tt.give(u2, 20, 60);
  perform tt.t_as(u); red := redeem_benefit(b);
  perform tt.t_as(u2);
  perform tt.t_raises('se agotó el cupo del día (cupo 1)', format('select redeem_benefit(%L)', b), 'Se agotaron los cupones de hoy');
  update redemptions set status = 'cancelled' where id = red.id;
  perform redeem_benefit(b);
  perform tt.t_pass('un canje cancelado devuelve el cupo');
  -- el cupo cuenta por día de La Paz: un canje de ayer no ocupa el de hoy
  b := tt.mk_benefit(5, 1); u := tt.mk_user(); perform tt.give(u, 20, 60); perform tt.give(u2, 20, 60);
  perform tt.t_as(u); red := redeem_benefit(b);
  update redemptions set created_at = now() - interval '26 hours' where id = red.id;
  perform tt.t_as(u2);
  perform redeem_benefit(b);
  perform tt.t_pass('el cupo se renueva cada día (canje de hace 26 h no cuenta)');
  -- cupo ilimitado
  b := tt.mk_benefit(1, null);
  for n in 1..4 loop
    u := tt.mk_user(); perform tt.give(u, 5, 60); perform tt.t_as(u); perform redeem_benefit(b);
  end loop;
  perform tt.t_pass('cupo nulo = ilimitado (4 canjes seguidos)');

  -- ===== Cuentas de prueba (QA): sin cooldown ni cupo =====
  u := tt.mk_user(); b := tt.mk_benefit(1, 1); perform tt.give(u, 20, 60);
  insert into qa_accounts (user_id) values (u);
  perform tt.t_as(u); perform redeem_benefit(b); perform redeem_benefit(b);
  perform tt.t_pass('cuenta QA: puede repetir en el mismo comercio y pasar el cupo');

  -- ===== Regenerar código =====
  u := tt.mk_user(); u2 := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 20, 60); perform tt.t_as(u);
  red := redeem_benefit(b);
  update redemptions set code_expires_at = now() - interval '1 minute' where id = red.id;
  r2 := regenerate_redemption_code(red.id);
  perform tt.t_true('regenerar renueva el vencimiento a 15 minutos', r2.code_expires_at = now() + interval '15 minutes');
  perform tt.t_true('regenerar mantiene un código de 6 dígitos', r2.code ~ '^[0-9]{6}$');
  perform tt.t_eq('regenerar no cobra otra vez', user_points_balance(u), 15);
  perform tt.t_as(u2);
  perform tt.t_raises('otra persona no puede regenerar', format('select regenerate_redemption_code(%L)', red.id), 'No se puede regenerar este código');
  perform tt.t_as(u);
  update redemptions set status = 'confirmed' where id = red.id;
  perform tt.t_raises('un canje confirmado no se regenera', format('select regenerate_redemption_code(%L)', red.id), 'No se puede regenerar este código');

  -- ===== Confirmar con el código (panel del comercio) =====
  owner := tt.mk_user(); other := tt.mk_user(); u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 20, 60);
  select business_id into bz from benefits where id = b;
  update businesses set owner_user_id = owner where id = bz;
  perform tt.t_as(u); red := redeem_benefit(b);
  perform tt.t_as(other);
  perform tt.t_raises('alguien ajeno al comercio no puede confirmar', format('select confirm_redemption_code(%L, %L)', bz, red.code), 'No autorizado');
  perform tt.t_as(owner);
  perform tt.t_raises('código inexistente', format('select confirm_redemption_code(%L, %L)', bz, case when red.code = '000000' then '000001' else '000000' end), 'Código no encontrado');
  r2 := confirm_redemption_code(bz, red.code);
  perform tt.t_eq('confirmar deja el canje confirmado', r2.status::text, 'confirmed');
  perform tt.t_eq('confirmar guarda quién lo confirmó', r2.confirmed_by, owner);
  perform tt.t_raises('confirmar dos veces', format('select confirm_redemption_code(%L, %L)', bz, red.code), 'Ese código ya fue confirmado');
  perform tt.t_as(u);
  perform tt.t_raises('un canje confirmado no se puede cancelar por vencido', format('select cancel_expired_redemption(%L)', red.id), 'ya no está pendiente');

  -- Cajero (staff) también confirma.
  u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 20, 60);
  select business_id into bz from benefits where id = b;
  insert into business_staff (business_id, email, user_id) values (bz, 'caja@test.local', other);
  perform tt.t_as(u); red := redeem_benefit(b);
  perform tt.t_as(other); r2 := confirm_redemption_code(bz, red.code);
  perform tt.t_eq('un cajero del comercio puede confirmar', r2.status::text, 'confirmed');

  -- Código vencido: el comercio no puede confirmarlo y el canje sigue pendiente para poder devolver los Puntos.
  u := tt.mk_user(); b := tt.mk_benefit(5); perform tt.give(u, 20, 60);
  select business_id into bz from benefits where id = b;
  update businesses set owner_user_id = owner where id = bz;
  perform tt.t_as(u); red := redeem_benefit(b);
  update redemptions set code_expires_at = now() - interval '1 second' where id = red.id;
  perform tt.t_as(owner);
  perform tt.t_raises('un código vencido no se confirma', format('select confirm_redemption_code(%L, %L)', bz, red.code), 'Ese código ya venció');
  select status::text into st from redemptions where id = red.id;
  perform tt.t_eq('intentar confirmar un vencido no pierde el derecho a la devolución (sigue pendiente)', st, 'pending');
  perform tt.t_as(u);
  perform cancel_expired_redemption(red.id);
  perform tt.t_eq('... y entonces se devuelven los Puntos', user_points_balance(u), 20);

  -- ===== Cancelar un canje vencido: devolución =====
  u := tt.mk_user(); u2 := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 30, 60); perform tt.t_as(u);
  red := redeem_benefit(b);
  perform tt.t_raises('antes de vencer no se puede cancelar', format('select cancel_expired_redemption(%L)', red.id), 'todavía no venció');
  update redemptions set code_expires_at = now() - interval '1 second' where id = red.id;
  perform tt.t_as(u2);
  perform tt.t_raises('otra persona no ve el canje', format('select cancel_expired_redemption(%L)', red.id), 'Canje no encontrado');
  perform tt.t_as(u);
  r2 := cancel_expired_redemption(red.id);
  perform tt.t_eq('el canje pasa a cancelado', r2.status::text, 'cancelled');
  perform tt.t_eq('se devuelven los Puntos (saldo vuelve a 30)', user_points_balance(u), 30);
  select * into led from points_ledger where user_id = u and amount > 0 and reason = 'redemption';
  perform tt.t_eq('la devolución es un asiento positivo de motivo redemption', led.amount, 10);
  perform tt.t_true('la nota explica la devolución', led.note like 'Te devolvimos los puntos%');
  perform tt.t_raises('no se devuelve dos veces', format('select cancel_expired_redemption(%L)', red.id), 'ya no está pendiente');
  perform tt.t_eq('tras devolver una sola vez el saldo sigue en 30', user_points_balance(u), 30);
  perform redeem_benefit(b);
  perform tt.t_pass('cancelar libera el cooldown: se puede volver a canjear ahí');

  -- ===== BUG: los Puntos devueltos nacen SIN vencimiento =====
  -- cancel_expired_redemption inserta la devolución sin expires_at (null = no vence nunca). Quien tiene Puntos por
  -- vencer puede "blanquearlos": canjea, espera 15 min, cancela y los recupera para siempre.
  u := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 10, 3); perform tt.t_as(u);   -- 10 Puntos que vencen en 3 días
  red := redeem_benefit(b);
  update redemptions set code_expires_at = now() - interval '1 second' where id = red.id;
  perform cancel_expired_redemption(red.id);
  select expires_at into led from points_ledger where user_id = u and amount > 0 and reason = 'redemption';
  perform tt.t_xfail_true('la devolución debería conservar un vencimiento', led.expires_at is not null, 'expires_at = NULL: esos Puntos ya no vencen');
  perform tt.t_xfail_true('tras canjear+cancelar, los Puntos que iban a vencer en 3 días ya no figuran por vencer', (select amount from points_expiring_soon(30)) > 0, 'amount=0');

  -- ===== Canjes pendientes que vencen y nadie cierra =====
  -- Hoy la única forma de devolver los Puntos es que la persona toque "cancelar" en la hoja del código
  -- (cancel_expired_redemption). Si cierra la hoja antes de que venza o mata la app, el canje queda 'pending' para
  -- siempre: Puntos retenidos, cooldown de 7 días en ese comercio y un cupo del día ocupado.
  select count(*) into n_sweepers from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.prosrc ilike '%update redemptions%' and p.prosrc ilike '%cancelled%';
  perform tt.t_eq('hoy hay una sola función que cancela canjes (la que dispara el cliente)', n_sweepers, 1);
  perform tt.t_xfail_true('un barrido del servidor debería cancelar solo los canjes pendientes con código vencido', n_sweepers > 1, 'no hay cron ni función que lo haga');
  u := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 10, 60); perform tt.t_as(u);
  red := redeem_benefit(b);
  update redemptions set code_expires_at = now() - interval '2 days' where id = red.id;   -- venció hace 2 días y nadie lo cerró
  perform tt.t_eq('canje vencido sin cerrar: los Puntos siguen retenidos', user_points_balance(u), 0);
  select status::text into st from redemptions where id = red.id;
  perform tt.t_eq('canje vencido sin cerrar: sigue figurando pendiente', st, 'pending');
  perform tt.t_raises('canje vencido sin cerrar: el cooldown sigue bloqueando ese comercio', format('select redeem_benefit(%L)', b), 'hace menos de 7 días');
end $$;

rollback;
