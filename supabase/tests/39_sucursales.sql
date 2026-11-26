-- Sucursales (0133): cada sucursal con su ubicación y su código; premios en todas o en algunas, con cupos por sucursal.
begin;

do $$
declare
  u uuid; u2 uuid; u3 uuid; owner uuid; stranger uuid; staff uuid;
  b uuid; b_other uuid; biz uuid; biz_other uuid; br uuid; br2 uuid;
  main_code text; br_code text; res jsonb; n integer; i integer;
begin
  -- Comercio con local principal en Tarija y una sucursal a ~2 km.
  b := tt.mk_benefit(10, null);
  select business_id into biz from benefits where id = b;
  owner := tt.mk_user(); stranger := tt.mk_user(); staff := tt.mk_user();
  update businesses set lat = -21.5274, lng = -64.7218, owner_user_id = owner, branch_label = 'Centro', approved = true where id = biz;
  perform tt.t_true('(preparación) el comercio queda aprobado', (select approved from businesses where id = biz));
  insert into business_staff (business_id, email, user_id) values (biz, 'staff@test.local', staff);
  select code into main_code from business_local_codes where business_id = biz;

  -- ===== El dueño agrega una sucursal desde el panel (con permisos de cliente) =====
  perform tt.as_client(owner);
  insert into business_branches (business_id, name, address, lat, lng) values (biz, 'Av. Las Américas', 'Av. Las Américas 123', -21.5074, -64.7218) returning id into br;
  perform tt.t_true('el dueño ve el código de su sucursal', exists (select 1 from business_branch_codes where branch_id = br));
  select code into br_code from business_branch_codes where branch_id = br;
  perform tt.as_admin();
  perform tt.t_true('cada sucursal nace con su código de 4 números', br_code ~ '^[0-9]{4}$');
  if br_code = main_code then
    update business_branch_codes set code = lpad(((main_code::int + 1) % 10000)::text, 4, '0') where branch_id = br;
    select code into br_code from business_branch_codes where branch_id = br;
  end if;

  perform tt.as_client(staff);
  perform tt.t_true('el equipo del local ve el código de la sucursal', exists (select 1 from business_branch_codes where branch_id = br));
  perform tt.as_client(stranger);
  perform tt.t_eq('otra persona no ve códigos de sucursales', (select count(*) from business_branch_codes)::int, 0);
  perform tt.t_true('cualquiera ve la sucursal de un comercio aprobado', exists (select 1 from business_branches where id = br));
  perform tt.t_raises('otra persona no puede agregar sucursales a un comercio ajeno',
    format('insert into business_branches (business_id, name, lat, lng) values (%L, %L, -21.5, -64.7)', biz, 'Falsa'), 'row-level security');
  perform tt.t_raises('otra persona no puede cambiar el código de una sucursal', format('select reset_branch_code(%L)', br), 'No autorizado');
  perform tt.as_admin();

  -- ===== Canje en la sucursal con su código =====
  u := tt.mk_user(); perform tt.give(u, 50, 60); perform tt.t_as(u);
  res := redeem_with_local_code(b, br_code, -21.5075, -64.7219);
  perform tt.t_eq('en la sucursal, con el código de la sucursal: ok', (res->>'ok')::boolean, true);
  perform tt.t_eq('queda confirmado al instante', res->'redemption'->>'status', 'confirmed');
  perform tt.t_eq('el canje queda anotado en esa sucursal', (select branch_id from redemptions where id = (res->'redemption'->>'id')::uuid), br);
  perform tt.t_true('la distancia anotada es la de la sucursal (no la del local principal)', (res->'redemption'->>'confirm_distance_m')::int < 300);

  u2 := tt.mk_user(); perform tt.give(u2, 50, 60); perform tt.t_as(u2);
  res := redeem_with_local_code(b, main_code, -21.5075, -64.7219);
  perform tt.t_eq('en la sucursal con el código del local principal: código incorrecto', res->>'reason', 'codigo_incorrecto');
  res := redeem_with_local_code(b, br_code, -21.5275, -64.7219);
  perform tt.t_eq('en el local principal con el código de la sucursal: código incorrecto', res->>'reason', 'codigo_incorrecto');
  res := redeem_with_local_code(b, br_code, -21.60, -64.7218);
  perform tt.t_eq('lejos de todas: lejos', res->>'reason', 'lejos');
  perform tt.t_true('lejos: dice la distancia a la sucursal más cercana (unos 8 km)', (res->>'distance_m')::int between 7000 and 11000);
  res := redeem_with_local_code(b, br_code, null, null);
  perform tt.t_eq('sin ubicación: no canjea', res->>'reason', 'sin_ubicacion');
  res := redeem_with_local_code(b, main_code, -21.5275, -64.7219);
  perform tt.t_eq('en el local principal con su código: ok (como siempre)', (res->>'ok')::boolean, true);
  perform tt.t_eq('el canje en el principal queda sin sucursal', (select branch_id from redemptions where id = (res->'redemption'->>'id')::uuid), null::uuid);

  -- ===== Premio solo en algunas sucursales, con cupos por sucursal =====
  perform tt.as_client(owner);
  insert into benefit_branches (benefit_id, branch_id) values (b, null);   -- solo en el principal
  perform tt.as_admin();
  u3 := tt.mk_user(); perform tt.give(u3, 50, 60); perform tt.t_as(u3);
  perform tt.t_raises('premio que no está en esta sucursal: avisa con el nombre de la sucursal',
    format('select redeem_with_local_code(%L, %L, -21.5075, -64.7219)', b, br_code), 'no está en la sucursal Av. Las Américas');
  select count(*) into n from redemptions where user_id = u3;
  perform tt.t_eq('... y no deja canje ni descuenta Puntos', n, 0);

  insert into benefit_branches (benefit_id, branch_id, daily_quota) values (b, br, 1);   -- y en la sucursal, 1 por día (ya usado por u)
  perform tt.t_raises('cupo de hoy de la sucursal agotado',
    format('select redeem_with_local_code(%L, %L, -21.5075, -64.7219)', b, br_code), 'Se agotaron los cupones de hoy de este premio en la sucursal Av. Las Américas');
  perform tt.t_eq('los cupos de la sucursal se ven en la app', (select redeemed_today from benefits_branch_remaining_today() where benefit_id = b and branch_id = br), 1);
  update benefit_branches set daily_quota = 2 where benefit_id = b and branch_id = br;
  res := redeem_with_local_code(b, br_code, -21.5075, -64.7219);
  perform tt.t_eq('con cupo libre en la sucursal: ok', (res->>'ok')::boolean, true);

  -- El cupo total del premio (daily_quota) sigue mandando por encima de los de cada sucursal.
  update benefits set daily_quota = 3 where id = b;
  u := tt.mk_user(); perform tt.give(u, 50, 60); perform tt.t_as(u);
  perform tt.t_raises('el tope diario total del premio sigue valiendo',
    format('select redeem_with_local_code(%L, %L, -21.5275, -64.7219)', b, main_code), 'Se agotaron los cupones de hoy');
  update benefits set daily_quota = null where id = b;

  -- ===== El panel guarda las sucursales de un premio de una vez =====
  perform tt.as_client(owner);
  perform set_benefit_branches(b, jsonb_build_array(jsonb_build_object('branch_id', br, 'daily_quota', 4)));
  perform tt.t_eq('el panel deja el premio solo en la sucursal elegida', (select count(*) from benefit_branches where benefit_id = b)::int, 1);
  perform tt.t_eq('... con sus cupos', (select daily_quota from benefit_branches where benefit_id = b and branch_id = br), 4);
  perform set_benefit_branches(b, jsonb_build_array(jsonb_build_object('branch_id', null, 'daily_quota', null), jsonb_build_object('branch_id', br, 'daily_quota', 2)));
  perform tt.t_eq('principal + sucursal', (select count(*) from benefit_branches where benefit_id = b)::int, 2);
  perform tt.t_raises('cupos fuera de rango', format('select set_benefit_branches(%L, %L::jsonb)', b, '[{"branch_id": null, "daily_quota": 0}]'), 'de 1 a 10.000');
  perform tt.t_eq('un error no borra lo que había', (select count(*) from benefit_branches where benefit_id = b)::int, 2);
  perform tt.as_client(stranger);
  perform tt.t_raises('otra persona no puede tocar los premios de un comercio', format('select set_benefit_branches(%L, %L::jsonb)', b, '[]'), 'No autorizado');
  perform tt.as_client(staff);
  perform tt.t_raises('el cajero tampoco (los premios los maneja el dueño)', format('select set_benefit_branches(%L, %L::jsonb)', b, '[]'), 'No autorizado');
  perform tt.as_admin();
  -- Las reglas de prueba de arriba siguen: principal sin tope + sucursal con 2 por día.

  -- ===== Reglas que no se pueden romper =====
  perform tt.as_admin();
  b_other := tt.mk_benefit(10, 3);
  select business_id into biz_other from benefits where id = b_other;
  perform tt.t_raises('una sucursal no se puede usar en el premio de otro comercio',
    format('insert into benefit_branches (benefit_id, branch_id) values (%L, %L)', b_other, br), 'no es de este comercio');
  perform tt.t_raises('una sucursal no se puede pasar a otro comercio',
    format('update business_branches set business_id = %L where id = %L', biz_other, br), 'No se puede mover');
  perform tt.t_raises('la misma sucursal no se repite en un premio',
    format('insert into benefit_branches (benefit_id, branch_id) values (%L, %L)', b, br), 'benefit_branches_unique');
  perform tt.t_raises('la principal tampoco se repite',
    format('insert into benefit_branches (benefit_id, branch_id) values (%L, null)', b), 'benefit_branches_unique');

  perform tt.as_client(owner);
  perform tt.t_true('el dueño puede cambiar el código de su sucursal', reset_branch_code(br) ~ '^[0-9]{4}$');
  perform tt.as_client(staff);
  perform tt.t_true('el equipo también (como el del local)', reset_branch_code(br) ~ '^[0-9]{4}$');
  perform tt.as_admin();

  -- Tope de 20 sucursales.
  for i in 1..19 loop
    insert into business_branches (business_id, name, lat, lng) values (biz, 'Suc ' || i, -21.5 - i * 0.001, -64.7);
  end loop;
  perform tt.t_raises('no más de 20 sucursales además de la principal',
    format('insert into business_branches (business_id, name, lat, lng) values (%L, %L, -21.4, -64.7)', biz, 'Una más'), 'hasta 20 sucursales');

  -- ===== Borrar una sucursal =====
  select id into br2 from redemptions where branch_id = br limit 1;
  delete from business_branches where id = br;
  perform tt.t_eq('al borrarla se van su código', (select count(*) from business_branch_codes where branch_id = br)::int, 0);
  perform tt.t_eq('... y sus reglas en los premios', (select count(*) from benefit_branches where branch_id = br)::int, 0);
  perform tt.t_eq('... y los canjes quedan (sin sucursal)', (select branch_id from redemptions where id = br2), null::uuid);

  perform tt.as_client(owner);
  perform set_benefit_branches(b, '[]'::jsonb);
  perform tt.t_eq('"en todas": no queda ninguna regla', (select count(*) from benefit_branches where benefit_id = b)::int, 0);
  perform tt.as_admin();

  -- ===== Permisos =====
  perform tt.t_true('anon no puede ejecutar los cupos por sucursal', not has_function_privilege('anon', 'benefits_branch_remaining_today()', 'execute'));
  perform tt.t_true('authenticated sí', has_function_privilege('authenticated', 'benefits_branch_remaining_today()', 'execute'));
  perform tt.t_true('anon no puede cambiar códigos', not has_function_privilege('anon', 'reset_branch_code(uuid)', 'execute'));
  perform tt.t_true('anon no puede tocar premios', not has_function_privilege('anon', 'set_benefit_branches(uuid,jsonb)', 'execute'));
end $$;

rollback;
