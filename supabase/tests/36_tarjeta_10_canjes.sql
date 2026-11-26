-- 0132: la tarjeta pasa de 5 a 10 canjes. Quien ya completó tarjetas de 5 no pierde los sellos que sumó después.
begin;

do $$
declare
  u uuid; owners uuid[] := '{}'; bens uuid[] := '{}'; bizs uuid[] := '{}';
  b uuid; bz uuid; o uuid; red redemptions; c jsonb; i integer;
begin
  u := tt.mk_user(6000, 'Ana Rojas');
  perform tt.give(u, 2000, 60);
  for i in 1..10 loop
    o := tt.mk_user(); b := tt.mk_benefit(20, 99);
    select business_id into bz from benefits where id = b;
    update businesses set owner_user_id = o, approved = true where id = bz;
    owners := owners || o; bens := bens || b; bizs := bizs || bz;
  end loop;

  -- 7 canjes confirmados.
  for i in 1..7 loop
    perform tt.t_as(u); red := redeem_benefit(bens[i]);
    perform tt.t_as(owners[i]); perform confirm_redemption_code(bizs[i], red.code);
  end loop;

  -- Una tarjeta vieja de 5, ya canjeada (como queda después de la migración: stamp_end = 5).
  perform tt.t_as(null);
  insert into loyalty_cards (user_id, seq, completed_at, expires_at, status, closed_at, stamp_end)
  values (u, 1, now() - interval '10 days', now() + interval '20 days', 'used', now() - interval '5 days', 5);

  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('con una tarjeta vieja de 5 y 7 canjes: 2 sellos (no se pierden)', (c->>'stamps')::int, 2);
  perform tt.t_eq('la tarjeta nueva pide 10', (c->>'goal')::int, 10);
  perform tt.t_eq('el historial muestra solo los 2 sellos nuevos', jsonb_array_length(c->'history'), 2);

  -- 8 canjes más: 2 + 8 = 10, la segunda tarjeta se completa en el sello 15.
  for i in 1..8 loop
    update redemptions set created_at = created_at - interval '15 days' where user_id = u;
    perform tt.t_as(u); red := redeem_benefit(bens[i]);
    perform tt.t_as(owners[i]); perform confirm_redemption_code(bizs[i], red.code);
  end loop;
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('con 15 canjes se completa la segunda tarjeta', (c->>'stamps')::int, 10);
  perform tt.t_true('... y tiene fecha de completada', c->>'completed_at' is not null);
  perform tt.t_eq('... que terminó en el sello 15', (select stamp_end from loyalty_cards where user_id = u and seq = 2), 15);
  perform tt.t_eq('... y su historial son sus 10 canjes', jsonb_array_length(c->'history'), 10);

  -- Una tarjeta vieja todavía abierta (de 5) se ve llena con su tamaño.
  perform tt.t_as(null);
  u := tt.mk_user();
  insert into loyalty_cards (user_id, seq, completed_at, expires_at, stamp_end)
  values (u, 1, now() - interval '1 day', now() + interval '29 days', 5);
  perform tt.t_as(u);
  c := my_camina_card();
  perform tt.t_eq('una tarjeta vieja abierta se ve 5 de 5', (c->>'stamps')::int, 5);
  perform tt.t_eq('... con meta 5', (c->>'goal')::int, 5);
end $$;

rollback;
