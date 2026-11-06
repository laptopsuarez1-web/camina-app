-- Textos en español neutro (sin voseo): los mensajes que manda el servidor (errores y avisos) decían "tenés", "podés",
-- "revisá", "acá", etc. Se vuelven a definir las mismas funciones, idénticas salvo esos textos.
CREATE OR REPLACE FUNCTION public.add_staff(p_business_id uuid, p_email text)
 RETURNS business_staff
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r business_staff;
  v_email text := lower(btrim(p_email));
begin
  if not exists (select 1 from businesses where id = p_business_id and owner_user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un correo válido.';
  end if;
  if (select count(*) from business_staff where business_id = p_business_id) >= 5 then
    raise exception 'Puedes tener hasta 5 cajeros.';
  end if;
  if exists (select 1 from businesses b join auth.users u on u.id = b.owner_user_id where b.id = p_business_id and lower(u.email) = v_email) then
    raise exception 'Ese correo es el tuyo.';
  end if;
  insert into business_staff (business_id, email) values (p_business_id, v_email)
  on conflict (business_id, email) do update set email = excluded.email
  returning * into r;
  return r;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_decide_story_share(p_id uuid, p_approve boolean)
 RETURNS story_shares
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s story_shares;
  v_bname text;
  v_pts integer := story_reward_points();
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede aprobar historias.';
  end if;
  select * into s from story_shares where id = p_id for update;
  if not found then
    raise exception 'Historia no encontrada';
  end if;
  if s.status <> 'pending' then
    raise exception 'Esta historia ya fue revisada.';
  end if;

  update story_shares
     set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now(), decided_by = auth.uid()
   where id = s.id
  returning * into s;

  select name into v_bname from businesses where id = s.business_id;
  if p_approve then
    insert into points_ledger (user_id, amount, reason, expires_at, note)
    values (s.user_id, v_pts, 'challenge', now() + (points_ttl_days() || ' days')::interval,
            'Historia en Instagram: ' || coalesce(v_bname, 'tu canje'));
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (s.user_id, '¡Gracias por tu historia! 📸',
            'Te acreditamos ' || v_pts || ' Puntos por tu historia de ' || coalesce(v_bname, 'tu canje') || '.',
            jsonb_build_object('type', 'story_approved', 'story_id', s.id), 'story_approved:' || s.id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  else
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (s.user_id, 'No encontramos tu historia',
            'Revisa que etiquetaste a @caminaapp y que tu cuenta deja ver historias. Puedes volver a mandarla desde Tus canjes.',
            jsonb_build_object('type', 'story_rejected', 'story_id', s.id),
            'story_rejected:' || s.id || ':' || extract(epoch from s.decided_at)::bigint)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return s;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bn_on_campaign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status <> old.status and new.status = 'sent' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu aviso cercano salió 📣', '"' || new.title || '" llegó a ' || coalesce(new.sent_count, 0) || ' personas.');
  elsif new.status <> old.status and new.status = 'rejected' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu aviso cercano no fue aprobado', 'Revisa el texto de "' || new.title || '" y vuelve a pedirlo.');
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.capture_referral(p_referrer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sin sesión';
  end if;
  if p_referrer_id is null or p_referrer_id = v_user_id then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_referrer_id) then
    return;
  end if;
  if exists (select 1 from referrals where referred_user_id = v_user_id) then
    return;
  end if;

  insert into referrals (referrer_user_id, referred_user_id) values (p_referrer_id, v_user_id);
  update profiles set referred_by = p_referrer_id where id = v_user_id and referred_by is null;

  -- La persona que entró con tu link te manda una solicitud de amistad; un fallo aquí nunca debe tirar el referido.
  begin
    perform friend_request_core(v_user_id, p_referrer_id);
  exception when others then
    null;
  end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_reto(p_reto_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r retos;
  v_met integer;
  v_claims integer;
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from retos where id = p_reto_id and active for update;
  if r.id is null then
    raise exception 'Ese reto no está disponible.';
  end if;
  v_met := _reto_met(r, auth.uid());
  select count(*) into v_claims from reto_claims where reto_id = r.id and user_id = auth.uid();

  if r.kind = 'referrals' then
    if v_met < (v_claims + 1) * r.target then
      raise exception 'Todavía te faltan amigos para este reto.';
    end if;
  else
    if v_met < r.target then
      raise exception 'Todavía no completaste este reto.';
    end if;
    if r.kind = 'steps_streak' and exists (
      select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid()
        and c.claimed_at > now() - (r.target || ' days')::interval
    ) then
      raise exception 'Ya cobraste este reto. Puedes volver a completarlo más adelante.';
    end if;
  end if;

  v_period := _reto_period(r, auth.uid(), v_met);
  insert into reto_claims (reto_id, user_id, period, points) values (r.id, auth.uid(), v_period, r.reward_points)
  on conflict (reto_id, user_id, period) do nothing;
  if not found then
    raise exception 'Ya cobraste este reto.';
  end if;

  insert into points_ledger (user_id, amount, reason, expires_at, note)
  values (auth.uid(), r.reward_points, 'challenge', now() + (points_ttl_days() || ' days')::interval, 'Reto: ' || r.title);

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  values (auth.uid(), '¡Reto cumplido! 🎉', 'Ganaste ' || r.reward_points || ' Puntos por "' || r.title || '".',
          jsonb_build_object('type', 'reto', 'reto_id', r.id), 'reto:' || r.id || ':' || auth.uid() || ':' || v_period)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return r.reward_points;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_group_challenge(p_group uuid, p_name text, p_rule text, p_daily_goal integer, p_start date, p_end date, p_stake integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_gname text;
begin
  if auth.uid() is null or not exists (select 1 from group_members where group_id = p_group and user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  -- Un solo gasto de Puntos a la vez por persona (mismo candado que redeem_benefit, SEC-06).
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not text_is_clean(p_name) then
    raise exception 'El nombre tiene palabras no permitidas.';
  end if;
  if p_start < v_today then
    raise exception 'La fecha de inicio ya pasó.';
  end if;
  if exists (select 1 from group_challenges where group_id = p_group and status = 'active') then
    raise exception 'Este grupo ya tiene un desafío en marcha. Espera a que termine.';
  end if;
  if p_stake > 0 and user_points_balance(auth.uid()) - user_points_reserved(auth.uid()) < p_stake then
    raise exception 'No te alcanzan los puntos para poner % en juego.', p_stake;
  end if;

  insert into group_challenges (group_id, created_by, name, rule, daily_goal, start_day, end_day, stake)
  values (p_group, auth.uid(), btrim(p_name), p_rule, p_daily_goal, p_start, p_end, p_stake)
  returning id into v_id;

  insert into group_challenge_entries (challenge_id, user_id, stake_paid) values (v_id, auth.uid(), p_stake);
  if p_stake > 0 then
    insert into points_ledger (user_id, amount, reason, note) values (auth.uid(), -p_stake, 'challenge', 'Pusiste en «' || btrim(p_name) || '»');
  end if;

  select name into v_gname from groups where id = p_group;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select m.user_id, 'Nuevo desafío en ' || v_gname || ' 🏆',
         '"' || btrim(p_name) || '" ya empezó a armarse. Entra y súmate.',
         jsonb_build_object('type', 'group_challenge', 'group_id', p_group), 'gch:' || v_id || ':' || m.user_id
  from group_members m where m.group_id = p_group and m.user_id <> auth.uid()
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.friend_request_core(p_me uuid, p_user uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row friendships;
  v_name text;
begin
  if p_me is null or p_user is null or p_me = p_user then
    raise exception 'No puedes agregarte a ti mismo.';
  end if;
  select full_name into v_name from profiles where id = p_me;
  if not exists (select 1 from profiles where id = p_user) or users_blocked(p_me, p_user) then
    return 'unavailable';
  end if;

  select * into v_row from friendships
   where (requester_id = p_me and addressee_id = p_user) or (requester_id = p_user and addressee_id = p_me);
  if found then
    if v_row.status = 'accepted' then return 'friends'; end if;
    if v_row.requester_id = p_me then return 'pending'; end if;
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = p_user and addressee_id = p_me;
    perform queue_notification(p_user, 'Nueva amistad',
      coalesce(v_name, 'Alguien') || ' aceptó tu solicitud. Ya pueden ver sus pasos.',
      jsonb_build_object('type', 'friend_accepted', 'user_id', p_me),
      'friend_accepted:' || p_me || ':' || p_user || ':' || local_today());
    return 'accepted';
  end if;

  if (select count(*) from friendships where requester_id = p_me and status = 'pending') >= 50 then
    raise exception 'Tienes muchas solicitudes sin responder. Espera a que contesten.';
  end if;

  insert into friendships (requester_id, addressee_id) values (p_me, p_user);
  perform queue_notification(p_user, 'Solicitud de amistad',
    coalesce(v_name, 'Alguien') || ' quiere ser tu amigo en Camina.',
    jsonb_build_object('type', 'friend_request', 'user_id', p_me),
    'friend_request:' || p_me || ':' || p_user || ':' || local_today());
  return 'sent';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_group_note()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_clean text := translate(lower(new.text), 'áéíóúüñ', 'aeiouun');
begin
  if exists (select 1 from profiles where id = new.user_id and suspended) then
    raise exception 'Tu cuenta está suspendida.';
  end if;
  if (select count(*) from group_notes where user_id = new.user_id and created_at > now() - interval '1 minute') >= 8 then
    raise exception 'Estás escribiendo muy rápido. Espera un momento.';
  end if;
  if exists (
    select 1 from banned_words w
    where v_clean ~ ('(^|[^a-z0-9])' || w.word || '([^a-z0-9]|$)')
  ) then
    raise exception 'Tu mensaje tiene palabras no permitidas. Escribilo de otra forma.';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_profile_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not text_is_clean(new.full_name) then
    raise exception 'Ese nombre tiene palabras no permitidas. Usa tu nombre real.';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.invite_friends_to_group(p_group uuid, p_users uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_group_name text;
  v_my_name text;
  v_user uuid;
  v_count integer := 0;
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  if p_users is null or cardinality(p_users) = 0 then return 0; end if;
  if cardinality(p_users) > 20 then raise exception 'Puedes invitar hasta 20 amigos a la vez.'; end if;
  if not is_group_member(p_group) then raise exception 'Solo quienes están en el grupo pueden invitar.'; end if;
  select name into v_group_name from groups where id = p_group;
  select full_name into v_my_name from profiles where id = v_me;

  for v_user in select distinct u from unnest(p_users) u loop
    continue when v_user = v_me;
    continue when not are_friends(v_me, v_user) or users_blocked(v_me, v_user);
    continue when exists (select 1 from group_members where group_id = p_group and user_id = v_user);
    insert into group_invites (group_id, invitee_id, inviter_id) values (p_group, v_user, v_me)
      on conflict (group_id, invitee_id) do nothing;
    if found then
      v_count := v_count + 1;
      perform queue_notification(v_user, 'Te invitaron a un grupo',
        coalesce(v_my_name, 'Un amigo') || ' te invitó a "' || v_group_name || '".',
        jsonb_build_object('type', 'group_invite', 'group_id', p_group),
        'group_invite:' || p_group || ':' || v_user || ':' || local_today());
    end if;
  end loop;
  return v_count;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.queue_expiring_points_notifications()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select u.user_id,
         'Tus Puntos te están esperando 🎁',
         'Tienes ' || e.amount || ' ' || (case when e.amount = 1 then 'Punto que se vence' else 'Puntos que se vencen' end)
           || ' en los próximos 5 días. Pasa por un comercio y canjéalos antes de perderlos.',
         jsonb_build_object('type', 'points_expiring'),
         'points_expiring:' || u.user_id || ':' || local_today()
  from (select distinct user_id from points_ledger where amount > 0 and expires_at between now() and now() + interval '5 days') u
  cross join lateral points_expiring_for(u.user_id, 5) e
  where e.amount > 0
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_benefit(p_benefit_id uuid)
 RETURNS redemptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_benefit benefits%rowtype;
  v_balance integer;
  v_cooldown_until timestamptz;
  v_now timestamptz := now();
  v_local_time time := (v_now at time zone 'America/La_Paz')::time;
  v_dow smallint;
  v_row redemptions;
  v_qa boolean;
  v_bname text;
  v_cost integer;
  v_free boolean := false;
  v_code text;
  v_ttl interval;
  v_tries integer := 0;
  v_pool boolean;
  v_coupon benefit_codes%rowtype;
  v_card loyalty_cards%rowtype;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  -- Un solo gasto de Puntos a la vez por persona: dos canjes simultáneos ya no leen el mismo saldo ni saltean el cooldown (SEC-06).
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  v_qa := exists (select 1 from qa_accounts where user_id = v_user);

  select * into v_benefit from benefits where id = p_benefit_id and active for update;
  if not found then
    raise exception 'Beneficio no disponible';
  end if;
  select name into v_bname from businesses where id = v_benefit.business_id;

  -- Tarjeta de fidelidad general: si la persona tiene una tarjeta completa, vigente, con ESTE premio elegido y todavía sin
  -- canje gratis (pendiente o confirmado), el canje sale gratis (0 Puntos). Camina no paga: el comercio puso el premio.
  perform camina_sync_card(v_user);
  select * into v_card from loyalty_cards c
  where c.user_id = v_user and c.status = 'open' and c.expires_at > v_now and c.chosen_benefit_id = p_benefit_id
    and not exists (select 1 from redemptions r where r.loyalty_card_id = c.id and r.status in ('pending', 'confirmed'));
  v_free := found;

  v_dow := extract(isodow from (v_now at time zone 'America/La_Paz'))::smallint - 1;
  if (v_benefit.valid_days_mask & (1 << v_dow)) = 0 then
    raise exception 'Este beneficio no está disponible hoy';
  end if;
  if v_benefit.valid_from is not null and v_benefit.valid_to is not null then
    if v_benefit.valid_from <= v_benefit.valid_to then
      if not (v_local_time between v_benefit.valid_from and v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    else
      if not (v_local_time >= v_benefit.valid_from or v_local_time <= v_benefit.valid_to) then
        raise exception 'Este beneficio no está disponible en este horario';
      end if;
    end if;
  end if;

  if not v_qa then
    select max(created_at) into v_cooldown_until
    from redemptions
    where user_id = v_user
      and business_id = v_benefit.business_id
      and status in ('pending', 'confirmed')
      and created_at > v_now - (business_redemption_cooldown_days() || ' days')::interval;
    if v_cooldown_until is not null and not v_free then
      raise exception 'Ya canjeaste en este comercio hace menos de % días', business_redemption_cooldown_days();
    end if;

    if v_benefit.online then
      -- Premio online: los cupos son totales (no por día). Con cupones propios de la tienda (canal web) los cupos son los cupones cargados.
      if v_benefit.online_channel <> 'web' and v_benefit.online_quota is not null and (select count(*) from redemptions
          where benefit_id = p_benefit_id
            and status in ('pending', 'confirmed')) >= v_benefit.online_quota then
        raise exception 'Se agotaron los cupones de este premio';
      end if;
    elsif v_benefit.daily_quota is not null and (select count(*) from redemptions
        where benefit_id = p_benefit_id
          and status in ('pending', 'confirmed')
          and (created_at at time zone 'America/La_Paz')::date = local_today()) >= v_benefit.daily_quota then
      raise exception 'Se agotaron los cupones de hoy para este beneficio';
    end if;
  end if;

  v_cost := case when v_free then 0 else v_benefit.cost_points end;

  v_balance := user_points_balance(v_user) - user_points_reserved(v_user);
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente';
  end if;

  -- Los Puntos NO se descuentan aquí: se reservan mientras el código está vigente y se descuentan cuando el local lo confirma.

  v_pool := v_benefit.online and v_benefit.online_channel = 'web';

  if v_pool then
    -- Cupón propio de la tienda (lo pega en su página al pagar): se entrega uno por canje y los Puntos se descuentan ya,
    -- porque la tienda no tiene cómo confirmar un cupón que se usa en su web.
    select * into v_coupon from benefit_codes
    where benefit_id = p_benefit_id and redemption_id is null
    order by created_at, id
    limit 1
    for update skip locked;
    if not found then
      raise exception 'Se agotaron los cupones de este premio';
    end if;

    insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, loyalty_card_id, code, code_expires_at, status, confirmed_at)
    values (v_user, p_benefit_id, v_benefit.business_id, v_cost, true, v_free, v_card.id, v_coupon.code,
            v_now + (online_code_ttl_days() || ' days')::interval, 'confirmed', v_now)
    returning * into v_row;

    update benefit_codes set redemption_id = v_row.id where id = v_coupon.id;
    if v_free then
      update loyalty_cards set status = 'used', closed_at = v_now, used_redemption_id = v_row.id where id = v_card.id;
    end if;

    if v_cost > 0 then
      insert into points_ledger (user_id, amount, reason, note)
      values (v_user, -v_cost, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
    end if;

    return v_row;
  end if;

  -- Premio online con código propio de Camina: vale 7 días (el pago por WhatsApp o redes puede tardar) y es único entre los pendientes del local.
  v_ttl := case when v_benefit.online then (online_code_ttl_days() || ' days')::interval
                else (redemption_code_ttl_minutes() || ' minutes')::interval end;
  loop
    v_code := generate_redemption_code();
    exit when not exists (
      select 1 from redemptions where business_id = v_benefit.business_id and code = v_code and status = 'pending'
    ) or v_tries >= 20;
    v_tries := v_tries + 1;
  end loop;

  insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, loyalty_card_id, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_cost, false, v_free, v_card.id,
    v_code, v_now + v_ttl
  )
  returning * into v_row;

  return v_row;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_event_ticket(p_id uuid)
 RETURNS promotion_tickets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  r promotions;
  v_bname text;
  v_row promotion_tickets;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  -- El candado del evento ordena los canjes de distintas personas: el cupo nunca se pasa.
  select * into r from promotions where id = p_id and status = 'approved' and kind = 'evento' for update;
  if r.id is null or now() > r.ends_at or r.ticket_points is null then
    raise exception 'Este evento no tiene entradas con Puntos.';
  end if;
  if exists (select 1 from promotion_tickets where promotion_id = p_id and user_id = v_user) then
    raise exception 'Ya tienes tu entrada.';
  end if;
  if (select count(*) from promotion_tickets where promotion_id = p_id) >= r.ticket_quota then
    raise exception 'Se agotaron las entradas con Puntos.';
  end if;
  if user_points_balance(v_user) - user_points_reserved(v_user) < r.ticket_points then
    raise exception 'Saldo insuficiente';
  end if;
  select name into v_bname from businesses where id = r.business_id;
  insert into points_ledger (user_id, amount, reason, note)
    values (v_user, -r.ticket_points, 'redemption', 'Entrada: ' || r.title || ' (' || coalesce(v_bname, 'un comercio') || ')');
  insert into promotion_tickets (promotion_id, user_id, points) values (p_id, v_user, r.ticket_points) returning * into v_row;
  insert into promotion_entries (promotion_id, user_id) values (p_id, v_user) on conflict do nothing;
  return v_row;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_promotion_v2(p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_goal_mode text, p_goal_steps integer, p_goal_days integer, p_winners integer, p_bg_color text, p_bg_image_url text, p_cta_url text, p_bg_logo boolean DEFAULT false)
 RETURNS promotions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b businesses;
  r promotions;
  v_max interval;
begin
  select * into b from businesses where id = p_business_id and owner_user_id = auth.uid();
  if b.id is null then
    raise exception 'No autorizado';
  end if;
  if not b.approved then
    raise exception 'Tu cuenta todavía está en revisión.';
  end if;
  if p_kind not in ('evento', 'desafio', 'publicidad') then
    raise exception 'Elige si es un evento, un desafío o publicidad.';
  end if;
  -- Bs 200 extra (comercio con local): solo evento o desafío. La publicidad es del paquete de Bs 400.
  if p_kind = 'publicidad' and b.account_kind <> 'events_only' then
    raise exception 'La publicidad es del paquete de solo publicidad.';
  end if;
  v_max := case when p_kind = 'evento' then interval '14 days' else interval '30 days' end;
  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + v_max then
    raise exception 'La vigencia máxima es de % días.', extract(day from v_max)::int;
  end if;
  if p_starts_at < now() - interval '1 hour' then
    raise exception 'La fecha de inicio ya pasó.';
  end if;
  if p_kind = 'desafio' then
    if p_goal_mode not in ('daily', 'total') or p_goal_steps is null then
      raise exception 'Elige la meta del desafío.';
    end if;
    if p_goal_mode = 'daily' and (p_goal_days is null or p_goal_steps > 60000
       or p_goal_days > ceil(extract(epoch from (p_ends_at - p_starts_at)) / 86400)::int + 1) then
      raise exception 'La meta por día no es válida para esas fechas.';
    end if;
  elsif p_goal_mode is not null then
    raise exception 'Solo los desafíos tienen meta de pasos.';
  end if;
  if p_bg_image_url is not null and p_bg_image_url !~ '^https://' then
    raise exception 'La foto de fondo no es válida.';
  end if;
  -- La publicidad lleva directo al link que elija el comercio (WhatsApp, Instagram, web...: no hace falta que sea un local).
  if p_kind = 'publicidad' and (p_cta_url is null or btrim(p_cta_url) !~ '^https://') then
    raise exception 'Pon el link al que lleva la publicidad (empieza con https://).';
  end if;
  if p_kind <> 'publicidad' and p_cta_url is not null then
    raise exception 'Solo la publicidad lleva link.';
  end if;
  insert into promotions (
    business_id, kind, title, description, prize, winners_count, starts_at, ends_at,
    goal_mode, goal_steps, goal_days, bg_color, bg_image_url, bg_logo, cta_url, price_bs
  ) values (
    p_business_id, p_kind, btrim(p_title), btrim(p_description), nullif(btrim(coalesce(p_prize, '')), ''),
    least(greatest(coalesce(p_winners, 1), 1), 10), p_starts_at, p_ends_at,
    case when p_kind = 'desafio' then p_goal_mode end,
    case when p_kind = 'desafio' then p_goal_steps end,
    case when p_kind = 'desafio' and p_goal_mode = 'daily' then p_goal_days end,
    coalesce(p_bg_color, 'violeta'), nullif(btrim(coalesce(p_bg_image_url, '')), ''), coalesce(p_bg_logo, false),
    nullif(btrim(coalesce(p_cta_url, '')), ''), promotion_price(b.account_kind)
  ) returning * into r;
  return r;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_promotion_v3(p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_goal_mode text, p_goal_steps integer, p_goal_days integer, p_winners integer, p_bg_color text, p_bg_image_url text, p_cta_url text, p_bg_logo boolean, p_photos text[], p_place_name text, p_place_address text, p_place_url text, p_ticket_price text, p_ticket_url text, p_ticket_points integer DEFAULT NULL::integer, p_ticket_quota integer DEFAULT NULL::integer)
 RETURNS promotions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r promotions;
  v_photos text[] := coalesce(p_photos, '{}');
  v_place_url text := nullif(btrim(coalesce(p_place_url, '')), '');
  v_ticket_url text := nullif(btrim(coalesce(p_ticket_url, '')), '');
  v_ticket_price text := nullif(btrim(coalesce(p_ticket_price, '')), '');
begin
  if p_kind = 'publicidad' and (cardinality(v_photos) > 0 or v_place_url is not null or nullif(btrim(coalesce(p_place_name, '')), '') is not null
                                or v_ticket_url is not null or v_ticket_price is not null or p_ticket_points is not null) then
    raise exception 'El banner solo lleva imagen y link.';
  end if;
  if cardinality(v_photos) > 8 then
    raise exception 'Hasta 8 fotos.';
  end if;
  if exists (select 1 from unnest(v_photos) u where u !~ '^https://' or char_length(u) > 500) then
    raise exception 'Alguna foto no es válida.';
  end if;
  if (v_place_url is not null and v_place_url !~ '^https://') or (v_ticket_url is not null and v_ticket_url !~ '^https://') then
    raise exception 'Los links tienen que empezar con https://';
  end if;
  if p_kind <> 'evento' and (v_ticket_url is not null or v_ticket_price is not null or p_ticket_points is not null) then
    raise exception 'Solo los eventos llevan entradas.';
  end if;
  if p_ticket_points is not null and (p_ticket_points < 1 or p_ticket_quota is null or p_ticket_quota < 1) then
    raise exception 'Para entradas con Puntos pon cuántos Puntos cuestan y cuántas entradas hay.';
  end if;
  if v_ticket_price is not null and v_ticket_url is null then
    raise exception 'Para vender entradas pon un contacto o link de compra.';
  end if;
  r := request_promotion_v2(
    p_business_id, p_kind, p_title, p_description, p_prize, p_starts_at, p_ends_at,
    p_goal_mode, p_goal_steps, p_goal_days, p_winners, p_bg_color, p_bg_image_url, p_cta_url, p_bg_logo
  );
  update promotions set
    photos = v_photos,
    place_name = nullif(btrim(coalesce(p_place_name, '')), ''),
    place_address = nullif(btrim(coalesce(p_place_address, '')), ''),
    place_url = v_place_url,
    ticket_price = v_ticket_price,
    ticket_url = v_ticket_url,
    ticket_points = p_ticket_points,
    ticket_quota = case when p_ticket_points is not null then p_ticket_quota end
  where id = r.id
  returning * into r;
  return r;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_story_share(p_redemption_id uuid, p_photo_path text, p_instagram text)
 RETURNS story_shares
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r redemptions;
  s story_shares;
  v_handle text := lower(btrim(regexp_replace(coalesce(p_instagram, ''), '^\s*@', '')));
  v_bname text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'Revisa tu usuario de Instagram: solo letras, números, puntos y guiones bajos.';
  end if;
  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> auth.uid()::text or p_photo_path like '%..%' then
    raise exception 'No encontramos la foto. Vuelve a elegirla.';
  end if;

  select * into r from redemptions where id = p_redemption_id and user_id = auth.uid();
  if not found then
    raise exception 'Canje no encontrado';
  end if;
  if r.status <> 'confirmed' then
    raise exception 'Solo puedes subir una historia de un canje confirmado.';
  end if;
  if r.confirmed_at < now() - (story_window_days() || ' days')::interval then
    raise exception 'Pasaron más de % días de este canje.', story_window_days();
  end if;

  select * into s from story_shares where redemption_id = r.id for update;
  if found then
    if s.status = 'approved' then
      raise exception 'Ya te acreditamos los Puntos por esta historia.';
    elsif s.status = 'pending' then
      raise exception 'Ya nos avisaste de esta historia. La estamos revisando.';
    end if;
    update story_shares
       set photo_path = p_photo_path, instagram_handle = v_handle, status = 'pending',
           created_at = now(), decided_at = null, decided_by = null
     where id = s.id
    returning * into s;
  else
    insert into story_shares (redemption_id, user_id, business_id, photo_path, instagram_handle)
    values (r.id, auth.uid(), r.business_id, p_photo_path, v_handle)
    returning * into s;
  end if;

  -- Aviso al equipo de Camina (también lo ven en el panel, sección Historias).
  select name into v_bname from businesses where id = r.business_id;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select a.user_id, 'Nueva historia para revisar 📸',
         '@' || v_handle || ' subió una historia de ' || coalesce(v_bname, 'un canje') || '.',
         jsonb_build_object('type', 'story_review', 'story_id', s.id),
         'story_review:' || s.id || ':' || a.user_id || ':' || extract(epoch from s.created_at)::bigint
  from app_admins a
  where exists (select 1 from profiles p where p.id = a.user_id)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return s;
end;
$function$
;

-- Aviso al comercio cuando su publicación no se aprueba (decía "Escribinos").
create or replace function bn_on_promotion() returns trigger as $$
begin
  if new.status <> old.status and new.status = 'approved' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu publicación fue aprobada ✅', '"' || new.title || '" ya se ve en la app.');
  elsif new.status <> old.status and new.status = 'rejected' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Tu publicación no fue aprobada', 'Escríbenos por WhatsApp para ajustarla: "' || new.title || '".');
  elsif new.status <> old.status and new.status = 'finished' then
    insert into business_notifications (business_id, title, body)
    values (new.business_id, 'Se hizo el sorteo 🎉', 'Sorteamos "' || new.title || '". Camina te pasa los ganadores para que les entregues el premio.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
