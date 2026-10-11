-- PROPUESTA 0052 (R01, crítico): canjes pendientes con el código vencido que nadie cierra.
-- Corrido SIN la propuesta muestra el bug: no existe el barrido, los Puntos quedan retenidos y el comercio bloqueado.
begin;

do $$
declare
  u uuid; u2 uuid; u3 uuid; b uuid; b2 uuid; b3 uuid; bz uuid;
  r_viejo redemptions; r_reciente redemptions; r_vivo redemptions; r_conf redemptions; r_cli redemptions; r_swp redemptions;
  hay boolean := to_regprocedure('public.expire_pending_redemptions(interval)') is not null;
  n integer; st text; led record; led2 record; cuantos integer;
begin
  -- ===== Escenario: canje que venció hace 2 días y nadie cerró (como los 2 de producción) =====
  u := tt.mk_user(); b := tt.mk_benefit(18, 5); perform tt.give(u, 30, 60);
  perform tt.t_as(u);
  r_viejo := redeem_benefit(b);
  update redemptions set code_expires_at = now() - interval '2 days' where id = r_viejo.id;
  perform tt.t_eq('antes del barrido: los 18 Puntos siguen retenidos (saldo 12)', user_points_balance(u), 12);
  perform tt.t_raises('antes del barrido: el cooldown de 14 días sigue bloqueando ese comercio', format('select redeem_benefit(%L)', b), 'hace menos de 14 días');

  -- Otros canjes que el barrido NO debe tocar.
  u2 := tt.mk_user(); b2 := tt.mk_benefit(5, 5); perform tt.give(u2, 20, 60); perform tt.t_as(u2);
  r_reciente := redeem_benefit(b2);
  update redemptions set code_expires_at = now() - interval '10 minutes' where id = r_reciente.id;   -- venció hace 10 min: dentro de la gracia
  b3 := tt.mk_benefit(5, 5);
  r_vivo := redeem_benefit(b3);                                                                      -- código todavía vigente
  u3 := tt.mk_user(); perform tt.give(u3, 20, 60); perform tt.t_as(u3);
  r_conf := redeem_benefit(tt.mk_benefit(5, 5));
  update redemptions set code_expires_at = now() - interval '3 days', status = 'confirmed' where id = r_conf.id;   -- confirmado: no se devuelve
  perform tt.as_admin();

  perform tt.t_true('existe expire_pending_redemptions(interval)', hay);
  if not hay then
    perform tt.t_fail('el barrido de canjes vencidos corre', 'no existe la función: los canjes vencidos quedan trabados para siempre');
    return;
  end if;

  -- ===== Permisos =====
  perform tt.t_true('authenticated NO puede ejecutar el barrido', not has_function_privilege('authenticated', 'public.expire_pending_redemptions(interval)', 'execute'));
  perform tt.t_true('anon NO puede ejecutar el barrido', not has_function_privilege('anon', 'public.expire_pending_redemptions(interval)', 'execute'));
  perform tt.t_true('service_role SÍ puede ejecutar el barrido', has_function_privilege('service_role', 'public.expire_pending_redemptions(interval)', 'execute'));
  perform tt.as_client(u);
  perform tt.t_raises('una persona logueada no puede disparar el barrido', 'select public.expire_pending_redemptions()', 'permission denied');
  perform tt.as_admin();

  -- ===== El barrido =====
  execute 'select public.expire_pending_redemptions()' into cuantos;
  perform tt.t_eq('el barrido cancela exactamente 1 canje (el vencido hace 2 días)', cuantos, 1);
  select status::text into st from redemptions where id = r_viejo.id;
  perform tt.t_eq('el canje vencido pasa a cancelado', st, 'cancelled');
  perform tt.t_eq('se devuelven los Puntos (saldo vuelve a 30)', user_points_balance(u), 30);
  select * into led from points_ledger where user_id = u and amount > 0 and reason = 'redemption';
  perform tt.t_eq('la devolución es un asiento positivo por el costo del canje', led.amount, 18);
  perform tt.t_true('la nota explica la devolución y nombra al comercio', led.note like 'Te devolvimos los puntos: venció el código de Comercio %');
  perform tt.t_eq('el libro suma 30: +30 (ganados) -18 (canje) +18 (devolución)', (select sum(amount)::int from points_ledger where user_id = u), 30);
  perform tt.t_as(u);
  perform redeem_benefit(b);
  perform tt.t_pass('se libera el cooldown: la persona puede volver a canjear en ese comercio');
  perform tt.as_admin();

  -- ===== Lo que NO toca =====
  select status::text into st from redemptions where id = r_reciente.id;
  perform tt.t_eq('vencido hace 10 minutos (dentro de la gracia de 1 hora): sigue pendiente, la persona aún puede regenerar', st, 'pending');
  perform tt.t_as(u2);
  r_reciente := regenerate_redemption_code(r_reciente.id);
  perform tt.t_pass('... y regenerar el código sigue funcionando');
  perform tt.as_admin();
  select status::text into st from redemptions where id = r_vivo.id;
  perform tt.t_eq('código todavía vigente: sigue pendiente', st, 'pending');
  select status::text into st from redemptions where id = r_conf.id;
  perform tt.t_eq('canje confirmado: no se toca', st, 'confirmed');
  perform tt.t_eq('... y no se le devolvió nada al que ya lo cobró', (select count(*) from points_ledger where user_id = u3 and amount > 0 and reason = 'redemption')::int, 0);

  -- ===== Idempotencia =====
  execute 'select public.expire_pending_redemptions()' into cuantos;
  perform tt.t_eq('segunda corrida: no hay nada más que cancelar', cuantos, 0);
  perform tt.t_eq('... y no se devuelve dos veces (el saldo no se mueve: 30 - 18 del segundo canje)', user_points_balance(u), 12);
  perform tt.t_eq('... un solo asiento de devolución para el canje cancelado', (select count(*) from points_ledger where user_id = u and amount > 0 and reason = 'redemption')::int, 1);

  -- ===== Gracia a medida: con p_grace = 0 se barre lo vencido hace 10 minutos =====
  update redemptions set code_expires_at = now() - interval '10 minutes' where id = r_reciente.id;
  execute 'select public.expire_pending_redemptions(interval ''0'')' into cuantos;
  perform tt.t_eq('con gracia 0 se barre también el vencido hace 10 minutos', cuantos, 1);
  perform tt.t_eq('... y se le devuelven sus 5 Puntos (saldo 10 -> 15; el canje con código vigente sigue reteniendo otros 5)', user_points_balance(u2), 15);

  -- ===== Misma devolución que el camino del cliente (cancel_expired_redemption) =====
  u := tt.mk_user(); u2 := tt.mk_user(); perform tt.give(u, 20, 60); perform tt.give(u2, 20, 60);
  perform tt.t_as(u);  r_cli := redeem_benefit(tt.mk_benefit(7, 5));
  perform tt.t_as(u2); r_swp := redeem_benefit(tt.mk_benefit(7, 5));
  update redemptions set code_expires_at = now() - interval '5 hours' where id in (r_cli.id, r_swp.id);
  perform tt.t_as(u);  perform cancel_expired_redemption(r_cli.id);
  perform tt.as_admin();
  perform public.expire_pending_redemptions();
  select amount, reason::text as reason, expires_at is null as sin_venc, regexp_replace(note, ' [^ ]+$', '') as nota into led from points_ledger where user_id = u and amount > 0 and reason = 'redemption';
  select amount, reason::text as reason, expires_at is null as sin_venc, regexp_replace(note, ' [^ ]+$', '') as nota into led2 from points_ledger where user_id = u2 and amount > 0 and reason = 'redemption';
  perform tt.t_true('la devolución del barrido es idéntica a la del cliente (monto, motivo, vencimiento y texto)', led.amount = led2.amount and led.reason = led2.reason and led.sin_venc = led2.sin_venc and led.nota = led2.nota);
  perform tt.t_eq('el saldo de quien canceló por el cliente vuelve a 20', user_points_balance(u), 20);
  perform tt.t_eq('el saldo de quien devolvió el barrido también vuelve a 20', user_points_balance(u2), 20);

  -- ===== FIFO / libro de Puntos: el saldo vuelve exacto a lo que era antes del canje =====
  u := tt.mk_user(); perform tt.give(u, 10, 5); perform tt.give(u, 10, 60);    -- dos lotes: vence en 5 días y en 60
  perform tt.t_as(u); r_swp := redeem_benefit(tt.mk_benefit(10, 5));
  perform tt.t_eq('FIFO: tras canjear 10 de 20 el saldo es 10', user_points_balance(u), 10);
  update redemptions set code_expires_at = now() - interval '2 days' where id = r_swp.id;
  perform tt.as_admin();
  perform public.expire_pending_redemptions();
  perform tt.t_eq('FIFO: tras el barrido el saldo vuelve a 20', user_points_balance(u), 20);
  perform tt.t_eq('FIFO: el libro conserva el asiento original del canje (-10) y suma la devolución (+10): nada se borra', (select count(*) from points_ledger where user_id = u)::int, 4);
end $$;

rollback;
