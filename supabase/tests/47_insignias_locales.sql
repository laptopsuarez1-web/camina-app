-- Insignias de locales (0083): puntos de nivel, Fan, premio solo para Fans, insignias públicas, fotos de la Ruta.
begin;

do $$
declare
  u uuid; u2 uuid; owner uuid; b uuid; biz uuid; red redemptions; i integer; res jsonb; fb uuid;
begin
  u := tt.mk_user(); b := tt.mk_benefit(1, 50); perform tt.give(u, 500, 60);
  select business_id into biz from benefits where id = b;
  owner := tt.mk_user();
  update businesses set owner_user_id = owner where id = biz;
  update profiles set daily_goal = 6000 where id = u;

  -- Un canje confirmado da +2.
  perform tt.t_as(u); red := redeem_benefit(b);
  perform tt.t_as(owner); red := confirm_redemption_code(biz, red.code);
  perform tt.as_admin();
  perform tt.t_eq('canje confirmado: +2', user_level_points(u, biz), 2);
  perform tt.t_eq('con 2 puntos es Visitante', level_name(2), 'visitante');
  perform tt.t_eq('Habitual desde 10', level_name(10), 'habitual');
  perform tt.t_eq('Fan desde 20', level_name(20), 'fan');

  -- Reseña: +1, una sola vez por canje.
  perform tt.t_as(u);
  perform tt.t_eq('calificar el local: +1', level_review(red.id), 3);
  perform tt.t_eq('calificar otra vez el mismo canje no suma', level_review(red.id), 3);

  -- Historia aprobada: +1.
  perform tt.as_admin();
  insert into story_shares (redemption_id, user_id, business_id, photo_path, instagram_handle) values (red.id, u, biz, u || '/x.jpg', 'yo');
  update story_shares set status = 'approved' where redemption_id = red.id;
  perform tt.t_eq('historia aprobada: +1', user_level_points(u, biz), 4);

  -- Llega a Fan con puntos de nivel (se cargan directo para no esperar 14 días entre canjes).
  for i in 1..8 loop
    insert into business_level_points (user_id, business_id, source, ref, points) values (u, biz, 'canje', gen_random_uuid(), 2);
  end loop;
  perform tt.t_eq('con 20 puntos llega a Fan', level_name(user_level_points(u, biz)), 'fan');
  perform tt.t_true('le avisa que ahora es Fan', exists (select 1 from notifications_outbox where user_id = u and title like '%Fan de%'));

  -- Premio solo para Fans.
  fb := gen_random_uuid();
  insert into benefits (id, business_id, name, type, cost_points, daily_quota, fans_only) values (fb, biz, 'Premio Fan', 'gratis', 1, 5, true);
  u2 := tt.mk_user(); perform tt.give(u2, 50, 60);
  perform tt.t_as(u2);
  perform tt.t_raises('quien no es Fan no puede canjear el premio de Fans', format('select redeem_benefit(%L)', fb), 'solo para los Fans');

  -- Insignias públicas y destacada.
  perform tt.as_client(u2);
  res := user_badges(u);
  perform tt.t_eq('cualquiera ve las insignias de otra persona', res->'locals'->0->>'level', 'fan');
  perform tt.as_admin();
  perform tt.t_as(u);
  perform set_featured_badge('local:' || biz);
  perform tt.t_eq('elige su insignia destacada', user_badges(u)->>'featured', 'local:' || biz);
  perform tt.t_raises('no acepta cualquier texto', 'select set_featured_badge(''hola'')', 'inválida');

  -- Panel: cuenta Fans; otra persona no lo ve.
  perform tt.t_as(owner);
  perform tt.t_eq('el local ve 1 Fan', (business_fans(biz)->>'fans')::int, 1);
  perform tt.t_as(u2);
  perform tt.t_raises('otra persona no ve los Fans del local', format('select business_fans(%L)', biz), 'No autorizado');

  -- Foto de la Ruta: solo con visita marcada.
  perform tt.t_as(u);
  perform tt.t_raises('sin visita no hay foto', format('select set_route_photo(%L, %L, %L)', route_month(), biz, u || '/f.jpg'), 'marca tu visita');
  perform tt.as_admin();
end $$;

rollback;
