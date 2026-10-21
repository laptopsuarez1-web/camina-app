-- Eventos con fotos, lugar y entradas (0062).
begin;

do $$
declare
  ow uuid; ow_pub uuid; b uuid; b_pub uuid; p promotions; ev uuid; u1 uuid; u2 uuid; u3 uuid; t promotion_tickets;
  q text := 'now()+interval ''1 day'',now()+interval ''3 days''';
begin
  perform tt.as_admin();
  ow := tt.mk_user(); ow_pub := tt.mk_user();
  insert into businesses (name, category, plan, approved, owner_user_id, account_kind) values ('Local', 'Otros', 'paso_firme', true, ow, 'commerce') returning id into b;
  insert into businesses (name, category, plan, approved, owner_user_id, account_kind) values ('Marca', 'Otros', 'paso_firme', true, ow_pub, 'events_only') returning id into b_pub;
  update businesses set approved = true where id in (b, b_pub);

  perform tt.t_as(ow);
  p := request_promotion_v3(b, 'evento', 'Noche de música', 'Música en vivo', null, now() + interval '1 day', now() + interval '2 days',
    null, null, null, 1, 'violeta', null, null, false,
    array['https://x.co/1.jpg', 'https://x.co/2.jpg'], 'Café Sol', 'Av. 6 de Agosto 123', 'https://maps.google.com/?q=1', 'Bs 30', 'https://wa.me/59170000000');
  perform tt.t_eq('evento: guarda las fotos', cardinality(p.photos), 2);
  perform tt.t_eq('evento: lugar', p.place_name, 'Café Sol');
  perform tt.t_eq('evento: entrada', p.ticket_price, 'Bs 30');
  perform tt.t_eq('evento: link de contacto', p.ticket_url, 'https://wa.me/59170000000');
  perform tt.t_eq('evento: sigue pendiente', p.status, 'pending');

  p := request_promotion_v3(b, 'evento', 'Sin extras', 'Descripcion', null, now() + interval '1 day', now() + interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, null, ' ', null, null, null, null);
  perform tt.t_eq('sin extras: fotos vacías', cardinality(p.photos), 0);
  perform tt.t_true('sin extras: lugar nulo', p.place_name is null);

  perform tt.t_raises('foto no https', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'evento', 'Evento', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, array['javascript:x'], null, null, null, null, null)$q$, 'foto');
  perform tt.t_raises('más de 8 fotos', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'evento', 'Evento', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, array_fill('https://x.co/a.jpg'::text, array[9]), null, null, null, null, null)$q$, 'Hasta 8');
  perform tt.t_raises('link de entradas no https', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'evento', 'Evento', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, null, null, null, null, null, 'http://x.co')$q$, 'https');
  perform tt.t_raises('desafío sin entradas', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'desafio', 'Desafío', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    'total', 5000, null, 1, 'violeta', null, null, false, null, null, null, null, 'Bs 5', null)$q$, 'Solo los eventos');

  -- Desafío sí puede llevar fotos y lugar.
  p := request_promotion_v3(b, 'desafio', 'Desafío con lugar', 'Descripcion', null, now() + interval '1 day', now() + interval '2 days',
    'total', 5000, null, 1, 'menta', null, null, false, array['https://x.co/1.jpg'], 'Mi local', null, null, null, null);
  perform tt.t_eq('desafío: lugar', p.place_name, 'Mi local');

  -- Banner: solo imagen y link.
  perform tt.t_as(ow_pub);
  perform tt.t_raises('banner con fotos se rechaza', $q$select request_promotion_v3(
    (select id from businesses where name='Marca'), 'publicidad', 'Banner', 'Descripcion', null, now()+interval '1 hour', now()+interval '2 days',
    null, null, null, 1, 'dorado', null, 'https://marca.com', false, array['https://x.co/1.jpg'], null, null, null, null, null)$q$, 'solo lleva');
  p := request_promotion_v3(b_pub, 'publicidad', 'Banner', 'Descripcion', null, now() + interval '1 hour', now() + interval '2 days',
    null, null, null, 1, 'dorado', null, 'https://marca.com', false, null, null, null, null, null, null);
  perform tt.t_eq('banner ok', p.cta_url, 'https://marca.com');

  -- Entradas con Puntos: 2 entradas de 30 Puntos.
  perform tt.t_as(ow);
  p := request_promotion_v3(b, 'evento', 'Con entradas', 'Descripcion', null, now() + interval '1 day', now() + interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, null, null, null, null, 'Bs 30', 'https://wa.me/591700', 30, 2);
  perform tt.t_eq('entradas: Puntos y cupo guardados', p.ticket_points * 100 + p.ticket_quota, 3002);
  perform tt.t_raises('Puntos sin cupo se rechaza', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'evento', 'Evento', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, null, null, null, null, null, null, 30, null)$q$, 'cuántas entradas');
  perform tt.t_raises('precio sin contacto se rechaza', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'evento', 'Evento', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    null, null, null, 1, 'violeta', null, null, false, null, null, null, null, 'Bs 30', null)$q$, 'contacto');
  perform tt.t_raises('desafío sin Puntos de entrada', $q$select request_promotion_v3(
    (select id from businesses where name='Local'), 'desafio', 'Desafío', 'Descripcion', null, now()+interval '1 day', now()+interval '2 days',
    'total', 5000, null, 1, 'violeta', null, null, false, null, null, null, null, null, null, 30, 2)$q$, 'Solo los eventos');
  perform tt.as_admin();
  ev := p.id;
  update promotions set status = 'approved' where id = ev;
  u1 := tt.mk_user(); u2 := tt.mk_user(); u3 := tt.mk_user();
  insert into points_ledger (user_id, amount, reason, expires_at) values (u1, 100, 'steps', now() + interval '30 days'), (u2, 100, 'steps', now() + interval '30 days'), (u3, 10, 'steps', now() + interval '30 days');

  perform tt.t_as(u3);
  perform tt.t_raises('saldo insuficiente', format('select redeem_event_ticket(%L)', ev), 'Saldo insuficiente');
  perform tt.t_as(u1);
  t := redeem_event_ticket(ev);
  perform tt.t_eq('canje: descuenta 30 Puntos', user_points_balance(u1), 70);
  perform tt.t_true('canje: queda anotado', exists (select 1 from promotion_entries where promotion_id = ev and user_id = u1));
  perform tt.t_raises('no se canjea dos veces', format('select redeem_event_ticket(%L)', ev), 'Ya tenés');
  perform tt.t_as(u2);
  t := redeem_event_ticket(ev);
  perform tt.t_eq('cupo: 2 canjeadas', (select taken from promotion_ticket_counts() where promotion_id = ev), 2);
  perform tt.as_admin();
  insert into points_ledger (user_id, amount, reason, expires_at) values (u3, 100, 'steps', now() + interval '30 days');
  perform tt.t_as(u3);
  perform tt.t_raises('se agotaron las entradas', format('select redeem_event_ticket(%L)', ev), 'agotaron');
  perform tt.t_eq('agotadas: no descuenta', user_points_balance(u3), 110);
  perform tt.t_as(ow);
  perform tt.t_eq('organizador ve quién tiene entrada', (select count(*) from promotion_ticket_holders(ev))::int, 2);
  perform tt.t_as(u1);
  perform tt.t_eq('una persona no ve la lista', (select count(*) from promotion_ticket_holders(ev))::int, 0);
end $$;

rollback;
