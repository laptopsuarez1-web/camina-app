-- Gestión de clientes (0128): permisos por rol, aislamiento entre negocios, cálculos de saldo y auditoría.
begin;

do $$
declare
  owner uuid; recep uuid; caja uuid; extra uuid; otro_owner uuid;
  biz uuid; biz2 uuid;
  acc jsonb; rol_recep uuid; rol_caja uuid; serv uuid; paq_serv uuid;
  cli uuid; cli2 uuid; res jsonb; pay gestion_payments; pk gestion_packages; summ jsonb; n integer; st business_staff;
  vis uuid; dash jsonb; rep jsonb;
begin
  owner := tt.mk_user(); recep := tt.mk_user(); caja := tt.mk_user(); extra := tt.mk_user(); otro_owner := tt.mk_user();
  biz := gen_random_uuid(); biz2 := gen_random_uuid();
  insert into businesses (id, name, category, plan, approved, owner_user_id) values (biz, 'Consultorio Uno', 'Fisioterapia', 'primer_paso', true, owner);
  insert into businesses (id, name, category, plan, approved, owner_user_id) values (biz2, 'Academia Dos', 'Academia', 'primer_paso', true, otro_owner);

  -- ===== El dueño entra: se crean configuración y roles =====
  perform tt.as_client(owner);
  acc := gestion_my_access(biz);
  perform tt.t_eq('el dueño es miembro', (acc->>'member')::boolean, true);
  perform tt.t_eq('el dueño tiene todos los permisos', jsonb_array_length(acc->'permissions'), cardinality(gestion_all_permissions()));
  perform tt.t_eq('se crean 3 roles base', (select count(*)::int from gestion_roles where business_id = biz), 3);
  select id into rol_recep from gestion_roles where business_id = biz and name = 'Recepción';
  select id into rol_caja from gestion_roles where business_id = biz and name = 'Cajero';

  perform gestion_save_settings(biz, '{"client_singular":"Paciente","client_plural":"Pacientes","currency":"Bs"}');
  perform tt.t_eq('cambia el nombre de los clientes', (select client_plural from gestion_settings where business_id = biz), 'Pacientes');
  serv := (gestion_save_service(biz, '{"name":"Sesión de fisioterapia","price":100,"duration_min":45}')).id;
  paq_serv := (gestion_save_service(biz, '{"name":"Paquete 10 sesiones","price":800,"sessions_included":10}')).id;

  -- ===== Invitaciones con rol =====
  perform tt.as_admin();
  update auth.users set email = 'recep@test.local' where id = recep;
  update auth.users set email = 'caja@test.local' where id = caja;
  perform tt.as_client(owner);
  st := gestion_invite_staff(biz, 'recep@test.local', rol_recep);
  perform tt.as_admin(); update business_staff set user_id = recep where id = st.id; perform tt.as_client(owner);
  st := gestion_invite_staff(biz, 'caja@test.local', rol_caja);
  perform tt.as_admin(); update business_staff set user_id = caja where id = st.id; perform tt.as_client(owner);

  -- ===== Clientes =====
  cli := (gestion_save_client(biz, jsonb_build_object('first_name', 'Juan', 'last_name', 'Pérez', 'phone', '70000000', 'service_id', serv))).id;
  cli2 := (gestion_save_client(biz, '{"first_name":"Ana","last_name":"Rojas"}')).id;

  -- ===== Asistencia con pago parcial =====
  res := gestion_register_visit(biz, jsonb_build_object('client_id', cli, 'service_id', serv, 'payment_amount', 60, 'payment_method', 'Efectivo'));
  perform tt.t_eq('la asistencia carga el precio del servicio', (res->'visit'->>'charge')::numeric, 100.00);
  perform tt.t_eq('el pago parcial queda registrado', (res->'payment'->>'amount')::numeric, 60.00);
  perform tt.t_eq('primer comprobante es el 1', (res->'payment'->>'receipt_number')::int, 1);
  summ := gestion_client_summary(cli);
  perform tt.t_eq('saldo pendiente = 100 - 60', (summ->>'balance')::numeric, 40.00);

  -- Pago anticipado deja saldo a favor.
  pay := gestion_register_payment(biz, jsonb_build_object('client_id', cli, 'amount', 100, 'method', 'QR'));
  perform tt.t_eq('comprobantes correlativos', pay.receipt_number, 2);
  perform tt.t_eq('saldo a favor = -60', (gestion_client_summary(cli)->>'balance')::numeric, -60.00);

  -- Descuento autorizado
  perform gestion_add_adjustment(biz, jsonb_build_object('client_id', cli, 'kind', 'cargo', 'amount', 10, 'reason', 'Material extra'));
  perform tt.t_eq('cargo suma deuda', (gestion_client_summary(cli)->>'balance')::numeric, -50.00);

  -- Paquete: se carga al venderlo y cada asistencia no carga nada.
  pk := gestion_sell_package(biz, jsonb_build_object('client_id', cli2, 'service_id', paq_serv, 'payment_amount', 300, 'payment_method', 'Efectivo'));
  perform tt.t_eq('paquete trae 10 sesiones', pk.sessions_total, 10);
  res := gestion_register_visit(biz, jsonb_build_object('client_id', cli2, 'package_id', pk.id));
  perform tt.t_eq('con paquete la asistencia no carga', (res->'visit'->>'charge')::numeric, 0.00);
  perform tt.t_eq('quedan 9 sesiones', gestion_package_remaining(pk.id), 9);
  perform tt.t_eq('saldo del paquete = 800 - 300', (gestion_client_summary(cli2)->>'balance')::numeric, 500.00);

  -- Anular no borra
  vis := (res->'visit'->>'id')::uuid;
  perform gestion_void_visit(vis, 'Error de carga');
  perform tt.t_eq('anular devuelve la sesión al paquete', gestion_package_remaining(pk.id), 10);
  perform tt.t_true('la asistencia anulada sigue en el historial', exists (select 1 from gestion_visits where id = vis and voided_at is not null));

  -- Validaciones
  perform tt.t_raises('pago con importe 0', format('select gestion_register_payment(%L, %L)', biz, jsonb_build_object('client_id', cli, 'amount', 0, 'method', 'QR')), 'mayor a 0');
  perform tt.t_raises('método de pago desconocido', format('select gestion_register_payment(%L, %L)', biz, jsonb_build_object('client_id', cli, 'amount', 5, 'method', 'Bitcoin')), 'método de pago');
  perform tt.t_raises('asistencia en el futuro', format('select gestion_register_visit(%L, %L)', biz, jsonb_build_object('client_id', cli, 'occurred_at', now() + interval '3 days')), 'futura');

  dash := gestion_dashboard(biz);
  perform tt.t_eq('panel: 2 clientes', (dash->>'clients_total')::int, 2);
  perform tt.t_eq('panel: ingresos del mes', (dash->>'income_month')::numeric, 460.00);
  perform tt.t_eq('panel: 1 asistencia hoy (la anulada no cuenta)', (dash->>'visits_today')::int, 1);
  perform tt.t_eq('panel: pendiente total', (dash->>'pending_total')::numeric, 500.00);
  rep := gestion_report(biz, current_date - 7, current_date + 1, 'week');
  perform tt.t_eq('reporte: ingresos', (rep->'totals'->>'income')::numeric, 460.00);

  -- ===== Recepción =====
  perform tt.as_client(recep);
  perform tt.t_true('recepción ve clientes', (select count(*) from gestion_clients where business_id = biz) = 2);
  res := gestion_register_visit(biz, jsonb_build_object('client_id', cli, 'service_id', serv));
  perform tt.t_true('recepción registra asistencias', res->'visit'->>'id' is not null);
  perform tt.t_raises('recepción no ve el panel con ingresos', format('select gestion_dashboard(%L)', biz), 'permiso');
  perform tt.t_raises('recepción no cambia la configuración', format('select gestion_save_settings(%L, %L)', biz, '{"currency":"USD"}'), 'permiso');
  perform tt.t_raises('recepción no hace descuentos', format('select gestion_add_adjustment(%L, %L)', biz, jsonb_build_object('client_id', cli, 'kind', 'descuento', 'amount', 10, 'reason', 'regalo')), 'permiso');
  perform tt.t_eq('recepción no ve la auditoría', (select count(*)::int from gestion_audit where business_id = biz), 0);
  perform tt.t_raises('nadie escribe directo en las tablas', format('insert into gestion_payments (business_id, client_id, amount, method, receipt_number) values (%L, %L, 1, %L, 99)', biz, cli, 'QR'), 'permission denied');

  -- ===== Cajero =====
  perform tt.as_client(caja);
  pay := gestion_register_payment(biz, jsonb_build_object('client_id', cli, 'amount', 20, 'method', 'Efectivo'));
  perform tt.t_true('cajero cobra', pay.id is not null);
  perform tt.t_true('cajero emite comprobante', gestion_receipt(pay.id)->'payment'->>'receipt_number' is not null);
  perform tt.t_raises('cajero no registra asistencias', format('select gestion_register_visit(%L, %L)', biz, jsonb_build_object('client_id', cli)), 'permiso');
  perform tt.t_raises('cajero no ve estadísticas', format('select gestion_report(%L, current_date - 1, current_date, %L)', biz, 'day'), 'permiso');
  perform tt.t_raises('cajero no gestiona el equipo', format('select gestion_save_role(%L, null, %L, %L)', biz, 'Todo', gestion_all_permissions()), 'permiso');

  -- ===== Otro negocio: aislamiento total =====
  perform tt.as_client(otro_owner);
  perform gestion_my_access(biz2);
  perform tt.t_eq('otro negocio no ve clientes ajenos', (select count(*)::int from gestion_clients where business_id = biz), 0);
  perform tt.t_eq('otro negocio no ve pagos ajenos', (select count(*)::int from gestion_payments where business_id = biz), 0);
  perform tt.t_raises('otro negocio no registra en uno ajeno', format('select gestion_register_payment(%L, %L)', biz, jsonb_build_object('client_id', cli, 'amount', 5, 'method', 'QR')), 'permiso');
  perform tt.t_raises('no puede cargar un cliente ajeno en su negocio', format('select gestion_register_visit(%L, %L)', biz2, jsonb_build_object('client_id', cli)), 'no encontrado');
  perform tt.t_eq('sin acceso: member=false', (gestion_my_access(biz)->>'member')::boolean, false);

  -- ===== Escalada de permisos y revocación =====
  perform tt.as_admin();
  update gestion_roles set permissions = array['staff.manage','clients.view'] where id = rol_recep;
  perform tt.as_client(recep);
  perform tt.t_raises('no puede dar permisos que no tiene', format('select gestion_save_role(%L, null, %L, %L)', biz, 'Jefe', array['finance.view']), 'no tienes');
  perform tt.t_raises('no puede cambiar su propio rol', format('select gestion_save_role(%L, %L, %L, %L)', biz, rol_recep, 'Recepción', array['clients.view']), 'propio rol');

  perform tt.as_client(owner);
  select id into st.id from business_staff where business_id = biz and user_id = caja;
  perform gestion_set_staff_role(st.id, null);
  perform tt.as_client(caja);
  perform tt.t_eq('acceso revocado: no ve clientes', (select count(*)::int from gestion_clients where business_id = biz), 0);
  perform tt.t_raises('acceso revocado: no cobra', format('select gestion_register_payment(%L, %L)', biz, jsonb_build_object('client_id', cli, 'amount', 5, 'method', 'QR')), 'permiso');

  -- ===== Auditoría =====
  perform tt.as_client(owner);
  select count(*) into n from gestion_audit where business_id = biz and action = 'payment.create';
  perform tt.t_eq('cada cobro queda auditado', n, 4);
  perform tt.t_true('auditoría guarda quién lo hizo', exists (select 1 from gestion_audit where business_id = biz and actor = caja and action = 'payment.create'));

  -- ===== Datos clínicos =====
  perform tt.t_raises('clínico apagado por defecto', format('select gestion_clinical_add(%L, %L)', cli, 'nota'), 'no están activados');
  perform gestion_save_settings(biz, '{"clinical_enabled":true}');
  perform gestion_clinical_add(cli, 'Dolor lumbar');
  perform tt.t_eq('se lee por función', (select count(*)::int from gestion_clinical_list(cli)), 1);
  perform tt.t_true('cada lectura clínica queda auditada', exists (select 1 from gestion_audit where action = 'clinical.read' and entity_id = cli));
  perform tt.t_raises('nadie lee la tabla clínica directo', 'select count(*) from gestion_clinical_notes', 'permission denied');
end $$;

rollback;
