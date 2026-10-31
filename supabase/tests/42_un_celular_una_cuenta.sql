-- 0068: un celular, una cuenta: la segunda cuenta en el mismo celular no hereda los pasos ya caminados.
begin;

do $$
declare
  a uuid; b uuid; c uuid; r text; today date := local_today();
begin
  perform tt.as_admin();
  a := tt.mk_user(5000, 'Primera');
  b := tt.mk_user(5000, 'Segunda');
  c := tt.mk_user(5000, 'Nueva');
  -- las personas de prueba traen su propio celular; los dejamos sin celular para probar el registro
  delete from user_devices where user_id in (a, b, c);
  delete from device_owners where user_id in (a, b, c);

  perform tt.t_as(a);
  perform tt.t_eq('sin celular registrado no suma pasos', earn_points_from_steps(a, today, 3000), 0);
  perform tt.t_eq('y no guarda los pasos', (select count(*)::int from steps_daily where user_id = a), 0);

  perform tt.t_eq('la primera cuenta se queda el celular', register_device('telefono-123456'), 'ok');
  perform tt.t_eq('registrarlo de nuevo sigue ok', register_device('telefono-123456'), 'ok');
  perform earn_points_from_steps(a, today, 3000);
  perform tt.t_eq('con su celular, suma', (select count(*)::int from steps_daily where user_id = a and day = today), 1);

  perform tt.t_as(b);
  perform tt.t_eq('la segunda cuenta queda bloqueada en ese celular', register_device('telefono-123456'), 'blocked');
  perform earn_points_from_steps(b, today, 9000);
  perform tt.t_eq('la segunda cuenta no copia los pasos', (select count(*)::int from steps_daily where user_id = b), 0);
  perform tt.t_eq('ni cobra Puntos', user_points_balance(b), 0);

  -- la segunda cuenta usa su propio celular y suma normal
  perform tt.t_eq('con su propio celular entra', register_device('telefono-abcdef'), 'ok');
  perform earn_points_from_steps(b, today, 100);
  perform tt.t_eq('y ya puede sumar pasos', (select count(*)::int from steps_daily where user_id = b), 1);

  -- vuelve a entrar en el celular de la primera: de nuevo bloqueada ahí
  perform tt.t_eq('de nuevo en el celular ajeno: bloqueada', register_device('telefono-123456'), 'blocked');
  delete from steps_daily where user_id = b;
  perform earn_points_from_steps(b, today, 100);
  perform tt.t_eq('mientras usa el celular ajeno no suma', (select count(*)::int from steps_daily where user_id = b), 0);

  -- cuenta nueva en el celular de la primera
  perform tt.t_as(c);
  perform tt.t_eq('cuenta nueva en celular ocupado: bloqueada', register_device('telefono-123456'), 'blocked');

  -- el equipo libera el celular y la cuenta nueva lo toma
  perform tt.as_client(c);
  perform tt.t_raises('una cuenta común no libera celulares', $q$select admin_release_device('telefono-123456')$q$, 'Solo el equipo');
  perform tt.as_admin();
  insert into app_admins (user_id) values (c);
  perform tt.as_client(c);
  perform admin_release_device('telefono-123456');
  perform tt.t_eq('liberado: la cuenta nueva lo toma', register_device('telefono-123456'), 'ok');
  perform earn_points_from_steps(c, today, 100);
  perform tt.t_eq('y suma pasos', (select count(*)::int from steps_daily where user_id = c), 1);
end $$;

rollback;
