-- Saldo y "puntos por vencer" con vencimiento FIFO (0033 user_points_balance, 0035 points_expiring_for / _soon).
-- Regla: los Puntos que se gastan consumen primero los que vencen antes; los vencidos no cuentan; nunca negativo.
begin;

do $$
declare
  u uuid; r record; n integer;
begin
  -- ===== Saldo =====
  u := tt.mk_user();
  perform tt.t_eq('sin movimientos el saldo es 0', user_points_balance(u), 0);

  perform tt.give(u, 10, 30);
  perform tt.t_eq('10 Puntos vigentes = saldo 10', user_points_balance(u), 10);

  perform tt.give(u, 7, -1);
  perform tt.t_eq('los Puntos vencidos no cuentan', user_points_balance(u), 10);

  perform tt.give(u, 3, null);
  perform tt.t_eq('los Puntos sin vencimiento cuentan', user_points_balance(u), 13);

  -- (sin lotes vencidos de por medio: ver más abajo el caso con vencidos)
  u := tt.mk_user();
  perform tt.give(u, 10, 30); perform tt.give(u, 3, null);
  insert into points_ledger (user_id, amount, reason) values (u, -4, 'redemption');
  perform tt.t_eq('gastar 4 de 13 deja 9', user_points_balance(u), 9);

  insert into points_ledger (user_id, amount, reason) values (u, -100, 'redemption');
  perform tt.t_eq('el saldo nunca es negativo', user_points_balance(u), 0);

  -- Límite exacto: vence "ahora" => ya está vencido (expires_at > now() es estricto).
  u := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, expires_at) values (u, 5, 'challenge', now());
  perform tt.t_eq('un lote que vence justo ahora ya no cuenta', user_points_balance(u), 0);
  insert into points_ledger (user_id, amount, reason, expires_at) values (u, 5, 'challenge', now() + interval '1 second');
  perform tt.t_eq('un lote que vence en 1 segundo todavía cuenta', user_points_balance(u), 5);

  -- ===== FIFO: gastar consume primero lo que vence antes =====
  -- A vence en 10 días (10 Puntos), B vence en 60 (10 Puntos). Se gastan 4: salen de A.
  u := tt.mk_user();
  perform tt.give(u, 10, 10); perform tt.give(u, 10, 60);
  insert into points_ledger (user_id, amount, reason) values (u, -4, 'redemption');
  perform tt.t_eq('saldo con dos lotes y un gasto de 4', user_points_balance(u), 16);
  select * into r from points_expiring_for(u, 14);
  perform tt.t_eq('por vencer en 14 días: A queda en 6 (se gastaron 4 de A, no de B)', r.amount, 6);
  select * into r from points_expiring_for(u, 90);
  perform tt.t_eq('por vencer en 90 días: 16 (A 6 + B 10)', r.amount, 16);

  -- Gasto que se come todo el lote que vence primero.
  u := tt.mk_user();
  perform tt.give(u, 10, 10); perform tt.give(u, 10, 60);
  insert into points_ledger (user_id, amount, reason) values (u, -10, 'redemption');
  select * into r from points_expiring_for(u, 14);
  perform tt.t_eq('gastar justo el lote A: no queda nada por vencer en 14 días', r.amount, 0);
  perform tt.t_eq('... y el saldo es el lote B', user_points_balance(u), 10);

  -- Lotes sin vencimiento se gastan al final.
  u := tt.mk_user();
  perform tt.give(u, 10, null); perform tt.give(u, 10, 5);
  insert into points_ledger (user_id, amount, reason) values (u, -5, 'redemption');
  select * into r from points_expiring_for(u, 14);
  perform tt.t_eq('sin vencimiento se gasta al final: el lote que vence en 5 días pierde 5', r.amount, 5);

  -- ===== Puntos por vencer: ventana, redondeo de días y vencidos =====
  u := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, expires_at) values (u, 4, 'challenge', now() + interval '2 days 5 hours');
  insert into points_ledger (user_id, amount, reason, expires_at) values (u, 9, 'challenge', now() + interval '20 days');
  insert into points_ledger (user_id, amount, reason, expires_at) values (u, 50, 'challenge', now() - interval '1 day');
  select * into r from points_expiring_for(u, 14);
  perform tt.t_eq('ventana de 14 días: solo el lote de 2 días (4 Puntos)', r.amount, 4);
  perform tt.t_eq('los días se redondean hacia arriba (2 días 5 h = 3)', r.days, 3);
  select * into r from points_expiring_for(u, 30);
  perform tt.t_eq('ventana de 30 días suma ambos lotes vigentes (13), sin los vencidos', r.amount, 13);
  perform tt.t_eq('los días son los del lote que vence primero', r.days, 3);
  select * into r from points_expiring_for(u, 1);
  perform tt.t_eq('nada por vencer en 1 día', r.amount, 0);

  -- La versión que usa la app lee a la persona logueada.
  perform tt.t_as(u);
  select * into r from points_expiring_soon(14);
  perform tt.t_eq('points_expiring_soon usa auth.uid()', r.amount, 4);
  perform tt.t_as(tt.mk_user());
  select * into r from points_expiring_soon(14);
  perform tt.t_eq('otra persona no ve los puntos de u', r.amount, 0);

  -- ===== BUG: un gasto hecho DESPUÉS de que venció un lote se "descuenta" de ese lote vencido =====
  -- user_points_balance resta del lote vencido (e) todo lo gastado (s), sin mirar CUÁNDO se gastó:
  --   saldo = u - max(0, s - e). Con A vencido (10) y B vigente (10), un gasto de 5 hecho hoy con B
  --   queda "absorbido" por A: el saldo sigue en 10 y el canje salió gratis.
  u := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (u, 10, 'challenge', now() - interval '100 days', now() - interval '10 days');        -- A: ganado hace 100 días, venció hace 10
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (u, 10, 'challenge', now() - interval '20 days', now() + interval '70 days');         -- B: vigente
  perform tt.t_eq('A vencido + B vigente: saldo 10', user_points_balance(u), 10);
  insert into points_ledger (user_id, amount, reason, earned_at) values (u, -5, 'redemption', now() - interval '1 day');   -- gasto con A ya vencido: solo podía salir de B
  perform tt.t_xfail_eq('gasto posterior al vencimiento de A: el saldo debería bajar a 5', user_points_balance(u), 5);
  perform tt.t_as(u);
  select * into r from points_expiring_soon(90);
  perform tt.t_xfail_eq('lo mismo en "puntos por vencer": B tendría 5, no 10', r.amount, 5);

  -- Lo que esto significa en la práctica: cualquier persona con Puntos que ya vencieron "regala" ese monto
  -- en canjes. Con 100 vencidos y 10 vigentes, canjear 10 deja el saldo en 10 (debería quedar en 0).
  u := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (u, 100, 'steps', now() - interval '200 days', now() - interval '110 days');
  perform tt.give(u, 10, 60);
  insert into points_ledger (user_id, amount, reason) values (u, -10, 'redemption');
  perform tt.t_xfail_eq('100 vencidos + 10 vigentes, se canjean 10: el saldo debería ser 0', user_points_balance(u), 0);
  insert into points_ledger (user_id, amount, reason) values (u, -10, 'redemption');
  insert into points_ledger (user_id, amount, reason) values (u, -10, 'redemption');
  perform tt.t_xfail_eq('... y tras 3 canjes de 10 (30 gastados con solo 10 vigentes) tampoco llega a 0', user_points_balance(u), 0);

  -- Contraparte correcta: el mismo gasto hecho ANTES de que A venciera sí sale de A (FIFO), el saldo no cambia.
  u := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (u, 10, 'challenge', now() - interval '100 days', now() - interval '10 days');
  insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
  values (u, 10, 'challenge', now() - interval '20 days', now() + interval '70 days');
  insert into points_ledger (user_id, amount, reason, earned_at) values (u, -5, 'redemption', now() - interval '30 days'); -- A todavía no vencía
  perform tt.t_eq('gasto anterior al vencimiento de A: sale de A, B queda en 10', user_points_balance(u), 10);
end $$;

rollback;
