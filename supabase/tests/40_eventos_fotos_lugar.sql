-- Eventos con fotos, lugar y entradas (0062).
begin;

do $$
declare
  ow uuid; ow_pub uuid; b uuid; b_pub uuid; p promotions;
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
end $$;

rollback;
