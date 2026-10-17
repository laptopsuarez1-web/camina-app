-- Amigos (0056): solicitud con aceptación mutua, privacidad de pasos, bloqueo, invitaciones de grupo, descripción y ranking abierto.
begin;

do $$
declare
  a uuid; b uuid; c uuid; d uuid; g uuid;
  today date := local_today(); wk date := date_trunc('week', local_today())::date;
  n integer; r text; names text; card jsonb; k integer;
begin
  a := tt.mk_user(6000, 'Ana'); b := tt.mk_user(6000, 'Beto'); c := tt.mk_user(6000, 'Carla'); d := tt.mk_user(6000, 'Dani');
  perform tt.seed_steps(a, today, 9000); perform tt.seed_steps(b, today, 12000); perform tt.seed_steps(c, today, 3000);

  -- ===== Solicitud y aceptación mutua =====
  perform tt.as_client(a);
  select send_friend_request(b) into r;
  perform tt.t_eq('Ana le manda una solicitud a Beto', r, 'sent');
  select send_friend_request(b) into r;
  perform tt.t_eq('repetirla no duplica: sigue pendiente', r, 'pending');
  perform tt.t_raises('no se puede agregar a uno mismo', format('select send_friend_request(%L)', a), 'vos mismo');
  select count(*) into n from my_friends();
  perform tt.t_eq('mientras no acepta, Ana no tiene amigos', n, 0);
  select count(*) into n from friends_weekly_ranking();
  perform tt.t_eq('... y su ranking de amigos es solo ella', n, 1);
  perform tt.as_admin();
  perform tt.t_eq('Beto recibió el aviso de la solicitud', (select count(*)::int from notifications_outbox where user_id = b and data->>'type' = 'friend_request'), 1);

  perform tt.as_client(c);
  card := friend_card(a);
  perform tt.t_eq('un desconocido ve la ficha sin pasos: relación none', card->>'relation', 'none');
  perform tt.t_true('... y sin racha ni calendario', not (card ? 'days') and not (card ? 'streak'));
  perform tt.as_admin();

  perform tt.as_client(b);
  select count(*) into n from friend_requests_incoming();
  perform tt.t_eq('Beto ve 1 solicitud', n, 1);
  card := friend_card(a);
  perform tt.t_eq('Beto ve que Ana le mandó una solicitud', card->>'relation', 'pending_in');
  perform tt.t_true('... pero todavía no ve sus pasos', not (card ? 'days'));
  perform respond_friend_request(a, true);
  select count(*) into n from my_friends();
  perform tt.t_eq('al aceptar, Beto tiene 1 amigo', n, 1);
  perform tt.as_admin();
  perform tt.t_eq('Ana recibió el aviso de que aceptó', (select count(*)::int from notifications_outbox where user_id = a and data->>'type' = 'friend_accepted'), 1);

  -- ===== Privacidad: los pasos solo los ven amigos =====
  perform tt.as_client(b);
  select string_agg(full_name, ',' order by total_steps desc) into names from friends_weekly_ranking();
  perform tt.t_eq('ranking de amigos de Beto: él y Ana, ordenados por pasos', names, 'Beto,Ana');
  select total_steps::int into n from friends_weekly_ranking() where full_name = 'Ana';
  perform tt.t_eq('Beto ve los pasos de la semana de Ana', n, 9000);
  card := friend_card(a);
  perform tt.t_eq('la ficha del amigo trae relación friend', card->>'relation', 'friend');
  perform tt.t_eq('... con su meta', (card->>'goal')::int, 6000);
  perform tt.t_eq('... el promedio diario de los últimos 7 días (9000/7)', (card->>'avg_week')::int, 1286);
  perform tt.t_eq('... y los días con pasos', jsonb_array_length(card->'days'), 1);
  perform tt.as_admin();

  perform tt.as_client(c);
  select count(*) into n from friends_weekly_ranking() where full_name in ('Ana', 'Beto');
  perform tt.t_eq('Carla (sin amistad) no ve a Ana ni a Beto en su ranking de amigos', n, 0);
  perform tt.as_admin();

  -- ===== Cruce de solicitudes: si los dos se piden, quedan amigos =====
  perform tt.as_client(c);
  perform send_friend_request(d);
  perform tt.as_client(d);
  select send_friend_request(c) into r;
  perform tt.t_eq('si la otra persona ya había pedido, queda aceptada', r, 'accepted');
  select count(*) into n from my_friends();
  perform tt.t_eq('Dani tiene 1 amigo', n, 1);
  perform tt.as_admin();

  -- ===== No se escribe directo =====
  perform tt.as_client(c);
  perform tt.t_raises('no se puede inventar una amistad a mano', format('insert into friendships (requester_id, addressee_id, status) values (%L, %L, ''accepted'')', c, a), 'permission denied');
  perform tt.t_raises('tampoco editarla a mano', format('update friendships set status = ''accepted'' where addressee_id = %L', c), 'permission denied');
  perform tt.t_raises('ni borrarla a mano', format('delete from friendships where requester_id = %L', d), 'permission denied');
  perform tt.as_admin();

  -- ===== Quitar amigo (sin aviso) =====
  perform tt.as_client(d);
  perform remove_friend(c);
  select count(*) into n from my_friends();
  perform tt.t_eq('Dani quita a Carla: ya no tiene amigos', n, 0);
  perform tt.as_client(c);
  select count(*) into n from my_friends();
  perform tt.t_eq('... y Carla tampoco (es mutuo)', n, 0);
  perform tt.as_admin();

  -- ===== Rechazar =====
  perform tt.as_client(d);
  perform send_friend_request(a);
  perform tt.as_client(a);
  perform respond_friend_request(d, false);
  select count(*) into n from friend_requests_incoming();
  perform tt.t_eq('al rechazar, la solicitud desaparece', n, 0);
  perform tt.as_admin();

  -- ===== Bloqueo =====
  perform tt.as_client(a);
  insert into user_blocks (blocker_id, blocked_id) values (a, b);
  select count(*) into n from my_friends();
  perform tt.t_eq('Ana bloquea a Beto: se corta la amistad', n, 0);
  card := friend_card(b);
  perform tt.t_true('... y no puede abrir su ficha', card is null);
  select send_friend_request(b) into r;
  perform tt.t_eq('... ni mandarle una solicitud', r, 'unavailable');
  select count(*) into n from global_weekly_ranking(20) where full_name = 'Beto';
  perform tt.t_eq('... ni lo ve en el ranking global', n, 0);
  perform tt.as_client(b);
  select count(*) into n from global_weekly_ranking(20) where full_name = 'Ana';
  perform tt.t_eq('Beto tampoco ve a Ana en el ranking global', n, 0);
  select send_friend_request(a) into r;
  perform tt.t_eq('Beto no puede pedirle amistad a quien lo bloqueó', r, 'unavailable');
  perform tt.as_admin();

  -- ===== Invitar amigos a un grupo =====
  insert into groups (name, created_by) values ('Los del gym', c) returning id into g;
  insert into group_members (group_id, user_id) values (g, c);
  perform tt.as_client(c);
  perform send_friend_request(d);
  perform tt.as_client(d);
  perform respond_friend_request(c, true);
  perform tt.as_client(c);
  select invite_friends_to_group(g, array[d, a]) into k;
  perform tt.t_eq('Carla invita a Dani (amigo) y no a Ana (no es su amiga): 1 invitación', k, 1);
  perform tt.as_client(d);
  select count(*) into n from pending_group_invites();
  perform tt.t_eq('Dani ve 1 invitación', n, 1);
  perform tt.t_raises('un no miembro no puede invitar', format('select invite_friends_to_group(%L, array[%L]::uuid[])', g, c), 'están en el grupo');
  perform tt.t_eq('Dani acepta y entra al grupo', accept_group_invite(g), g);
  perform tt.as_admin();
  perform tt.t_true('... queda como miembro', exists (select 1 from group_members where group_id = g and user_id = d));
  perform tt.t_eq('... y la invitación se borra', (select count(*)::int from group_invites), 0);
  perform tt.as_client(a);
  perform tt.t_eq('sin invitación no se entra a un grupo', accept_group_invite(g), null::uuid);
  perform tt.as_admin();

  -- ===== Descripción "Sobre mí" =====
  perform tt.as_client(d);
  update profiles set bio = '  Camino al trabajo  ' where id = d;
  perform tt.as_admin();
  perform tt.t_eq('la descripción se guarda sin espacios de más', (select bio from profiles where id = d), 'Camino al trabajo');
  perform tt.t_raises('más de 80 caracteres se rechaza', format('update profiles set bio = %L where id = %L', repeat('x', 81), d), 'profiles_bio_len');
  insert into banned_words (word) values ('malapalabra') on conflict do nothing;
  perform tt.t_raises('con palabras prohibidas se rechaza', format('update profiles set bio = %L where id = %L', 'sos una malapalabra', d), 'no permitidas');
  perform tt.as_client(c);
  card := friend_card(d);
  perform tt.t_eq('Carla (amiga y del mismo grupo) ve la descripción', card->>'bio', 'Camino al trabajo');
  perform tt.as_client(a);
  card := friend_card(d);
  perform tt.t_true('Ana (sin amistad ni grupo en común) no la ve', card->>'bio' is null);
  perform tt.as_admin();

  -- ===== Racha =====
  perform tt.seed_steps(a, today - 2, 7000); perform tt.seed_steps(a, today - 1, 7000); perform tt.seed_steps(a, today, 7000);
  perform tt.t_eq('racha de 3 días (hoy cuenta si llegó a la meta)', user_streak(a), 3);
  perform tt.seed_steps(a, today, 100);
  perform tt.t_eq('si hoy todavía no llegó, la racha sigue con ayer', user_streak(a), 2);
  perform tt.seed_steps(a, today - 1, 100);
  perform tt.t_eq('si ayer falló y hoy no llegó, la racha es 0', user_streak(a), 0);

  -- ===== El link de invitación manda la solicitud =====
  declare e uuid := tt.mk_user(6000, 'Eva'); begin
    perform tt.as_client(e);
    perform capture_referral(c);
    perform tt.as_admin();
    perform tt.t_true('capture_referral deja una solicitud pendiente de la persona nueva al referente',
      exists (select 1 from friendships where requester_id = e and addressee_id = c and status = 'pending'));
    perform tt.t_true('... y el referido igual queda anotado', exists (select 1 from referrals where referrer_user_id = c and referred_user_id = e));
  end;

  -- ===== Ranking global abierto desde el primer usuario + mi puesto =====
  delete from steps_daily; delete from user_blocks;
  perform tt.seed_steps(a, today, 9000); perform tt.seed_steps(b, today, 12000); perform tt.seed_steps(c, today, 3000);
  perform tt.as_client(c);
  select string_agg(full_name, ',' order by total_steps desc) into names from global_weekly_ranking(20);
  perform tt.t_eq('el ranking global funciona con pocos usuarios (ya no espera 1.000)', names, 'Beto,Ana,Carla');
  perform tt.t_eq('mi puesto: Carla va 3.º', (select rank_position from my_weekly_rank()), 3::bigint);
  update profiles set ranking_visible = false where id = c;
  perform tt.t_eq('con el ranking apagado no tengo puesto', (select count(*)::int from my_weekly_rank()), 0);
  perform tt.as_admin();

  -- ===== Permisos =====
  perform tt.t_true('anon no puede pedir amigos', not has_function_privilege('anon', 'my_friends()', 'execute'));
  perform tt.t_true('authenticated sí', has_function_privilege('authenticated', 'friend_card(uuid)', 'execute'));
  perform tt.t_true('los ayudantes internos no los ejecuta nadie con cuenta', not has_function_privilege('authenticated', 'user_streak(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'friend_request_core(uuid,uuid)', 'execute')
    and not has_function_privilege('authenticated', 'are_friends(uuid,uuid)', 'execute'));
end $$;

rollback;
