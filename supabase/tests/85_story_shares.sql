-- Historias de Instagram por un canje (0055): submit_story_share, admin_story_shares, admin_decide_story_share.
begin;

do $$
declare
  u uuid; u2 uuid; adm uuid; b uuid; bz uuid; red uuid; old_red uuid; pend_red uuid; s story_shares; n integer; bal integer;
begin
  u := tt.mk_user(); u2 := tt.mk_user(); adm := tt.mk_user(6000, 'Equipo');
  insert into app_admins (user_id) values (adm);
  b := tt.mk_benefit(10); select business_id into bz from benefits where id = b;
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status, confirmed_at)
  values (u, b, bz, 10, '123456', now(), 'confirmed', now() - interval '1 hour') returning id into red;
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status, confirmed_at)
  values (u, b, bz, 10, '123457', now(), 'confirmed', now() - interval '8 days') returning id into old_red;
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status)
  values (u, b, bz, 10, '123458', now() + interval '10 minutes', 'pending') returning id into pend_red;

  -- ===== Validaciones al avisar =====
  perform tt.as_client(u);
  perform tt.t_raises('usuario de Instagram inválido', format('select submit_story_share(%L, %L, %L)', red, u || '/a.jpg', 'no vale!'), 'usuario de Instagram');
  perform tt.t_raises('la foto tiene que estar en su carpeta', format('select submit_story_share(%L, %L, %L)', red, u2 || '/a.jpg', 'sofi'), 'foto');
  perform tt.t_raises('canje pendiente no vale', format('select submit_story_share(%L, %L, %L)', pend_red, u || '/a.jpg', 'sofi'), 'confirmado');
  perform tt.t_raises('canje de hace más de 7 días no vale', format('select submit_story_share(%L, %L, %L)', old_red, u || '/a.jpg', 'sofi'), '7 días');
  perform tt.as_client(u2);
  perform tt.t_raises('no se puede usar el canje de otra persona', format('select submit_story_share(%L, %L, %L)', red, u2 || '/a.jpg', 'otra'), 'Canje no encontrado');

  -- ===== Aviso feliz =====
  perform tt.as_client(u);
  s := submit_story_share(red, u || '/a.jpg', '@Sofi.Camina');
  perform tt.t_eq('queda pendiente', s.status, 'pending');
  perform tt.t_eq('el usuario se guarda sin @ y en minúsculas', s.instagram_handle, 'sofi.camina');
  perform tt.t_raises('no se puede avisar dos veces mientras se revisa', format('select submit_story_share(%L, %L, %L)', red, u || '/b.jpg', 'sofi'), 'revisando');
  perform tt.t_raises('una persona no puede escribir la tabla directo', format('update story_shares set status = %L where id = %L', 'approved', s.id), 'permission denied');
  select count(*) into n from story_shares;
  perform tt.t_eq('la persona ve solo su historia', n, 1);
  perform tt.t_raises('una persona no puede aprobar', format('select admin_decide_story_share(%L, true)', s.id), 'Solo el equipo');
  perform tt.as_admin();
  select count(*) into n from notifications_outbox where user_id = adm and data->>'type' = 'story_review';
  perform tt.t_eq('le llega un aviso al equipo', n, 1);

  -- ===== Rechazo y reintento =====
  perform tt.as_client(adm);
  select count(*) into n from admin_story_shares('pending');
  perform tt.t_eq('el panel lista la historia pendiente', n, 1);
  s := admin_decide_story_share(s.id, false);
  perform tt.t_eq('rechazada', s.status, 'rejected');
  perform tt.as_admin();
  perform tt.t_eq('rechazar no da Puntos', user_points_balance(u), 0);
  perform tt.as_client(u);
  s := submit_story_share(red, u || '/c.jpg', 'sofi.camina');
  perform tt.t_eq('después de un rechazo se puede volver a mandar', s.status, 'pending');

  -- ===== Aprobación =====
  perform tt.as_client(adm);
  s := admin_decide_story_share(s.id, true);
  perform tt.t_eq('aprobada', s.status, 'approved');
  perform tt.t_raises('no se puede revisar dos veces', format('select admin_decide_story_share(%L, true)', s.id), 'ya fue revisada');
  perform tt.as_admin();
  bal := user_points_balance(u);
  perform tt.t_eq('se acreditan 5 Puntos', bal, 5);
  perform tt.t_true('el movimiento dice que es por la historia',
    exists (select 1 from points_ledger where user_id = u and amount = 5 and note like 'Historia en Instagram: %' and expires_at is not null));
  perform tt.t_true('le llega el aviso de los Puntos', exists (select 1 from notifications_outbox where user_id = u and data->>'type' = 'story_approved'));
  perform tt.as_client(u);
  perform tt.t_raises('una vez aprobada no se puede volver a mandar', format('select submit_story_share(%L, %L, %L)', red, u || '/d.jpg', 'sofi'), 'Ya te acreditamos');
  perform tt.as_admin();
end $$;

rollback;
