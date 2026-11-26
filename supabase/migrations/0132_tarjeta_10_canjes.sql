-- 0132: la tarjeta de fidelidad de Camina pasa de 5 a 10 canjes confirmados (pedido de Marcos, 2026-11-26).
--
-- Antes, la tarjeta número n se completaba en el sello 5n (contando desde el primer canje). Si solo se cambiara el 5 por 10,
-- las tarjetas ya completadas quedarían mal contadas: alguien con 1 tarjeta (5 sellos) y 7 canjes pasaría a tener 0 sellos.
-- Ahora cada tarjeta guarda en qué sello terminó (stamp_end) y la siguiente empieza ahí:
--   - las tarjetas que ya existen terminaron en seq * 5 (todas se hicieron con 5);
--   - la tarjeta en curso conserva los sellos que tenía, y ahora necesita 10 para completarse;
--   - quien tenía 5 o más sellos sin tarjeta completa no la completa "de golpe": sigue sumando hasta 10.

alter table loyalty_cards add column if not exists stamp_end integer;
update loyalty_cards set stamp_end = seq * 5 where stamp_end is null;

create or replace function loyalty_goal() returns integer
language sql immutable set search_path = public
as $f$ select 10 $f$;

-- Completa las tarjetas que correspondan: la siguiente termina loyalty_goal() sellos después de donde terminó la anterior.
create or replace function camina_sync_card(p_user uuid) returns void
language plpgsql security definer set search_path = public
as $f$
declare
  v_n integer;
  v_base integer;
  v_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('camina_card:' || p_user::text, 0));
  loop
    select count(*), coalesce(max(stamp_end), 0) into v_n, v_base from loyalty_cards where user_id = p_user;
    select s.ts into v_at from (
      select coalesce(r.confirmed_at, r.created_at) as ts, r.id
      from redemptions r
      where r.user_id = p_user and r.status = 'confirmed' and not r.loyalty_free
      order by coalesce(r.confirmed_at, r.created_at), r.id
      offset v_base + loyalty_goal() - 1 limit 1
    ) s;
    exit when v_at is null;
    insert into loyalty_cards (user_id, seq, completed_at, expires_at, stamp_end)
    values (p_user, v_n + 1, v_at, v_at + (loyalty_card_days() || ' days')::interval, v_base + loyalty_goal())
    on conflict (user_id, seq) do nothing;
    exit when not found;
  end loop;
  update loyalty_cards set status = 'expired', closed_at = expires_at
  where user_id = p_user and status = 'open' and expires_at <= now();
end;
$f$;
revoke execute on function camina_sync_card(uuid) from public, anon, authenticated;
grant execute on function camina_sync_card(uuid) to service_role;

-- Mi tarjeta: los sellos se cuentan desde donde terminó la última tarjeta (no desde tarjetas * 5).
create or replace function my_camina_card() returns jsonb
language plpgsql security definer set search_path = public
as $f$
declare
  v_user uuid := auth.uid();
  v_goal integer := loyalty_goal();
  v_card loyalty_cards%rowtype;
  v_cards integer;
  v_total integer;
  v_stamps integer;
  v_options jsonb := '[]'::jsonb;
  v_history jsonb;
  v_past jsonb;
  v_base integer;   -- sellos ya usados por tarjetas completadas (fin de la última)
  v_from integer;   -- dónde empiezan los sellos de la tarjeta que se muestra
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform camina_sync_card(v_user);

  select * into v_card from loyalty_cards where user_id = v_user and status = 'open' order by seq desc limit 1;
  select count(*), coalesce(max(stamp_end), 0) into v_cards, v_base from loyalty_cards where user_id = v_user;
  select count(*) into v_total from redemptions where user_id = v_user and status = 'confirmed' and not loyalty_free;

  if v_card.id is not null then
    -- Una tarjeta completa se muestra llena con su propio tamaño (las completadas antes de este cambio son de 5).
    v_goal := v_card.stamp_end - coalesce((select max(stamp_end) from loyalty_cards where user_id = v_user and seq < v_card.seq), 0);
    v_stamps := v_goal;
    -- Los premios en orden "parejo" por persona (no siempre los mismos primero), más el que ya eligió aunque haya dejado de participar.
    select coalesce(jsonb_agg(camina_prize_json(x.id) order by x.ord), '[]'::jsonb) into v_options from (
      select be.id, md5(v_user::text || be.id::text) as ord
      from benefits be join businesses b on b.id = be.business_id
      where camina_prize_participates(be.id) or be.id = v_card.chosen_benefit_id
    ) x;
  else
    v_stamps := least(greatest(v_total - v_base, 0), v_goal);
  end if;

  v_from := case when v_card.id is not null
    then coalesce((select max(stamp_end) from loyalty_cards where user_id = v_user and seq < v_card.seq), 0)
    else v_base end;

  -- "Dónde y cuándo canjeaste": los sellos de la tarjeta en curso (o de la última completada, si todavía está abierta).
  select coalesce(jsonb_agg(jsonb_build_object('business_name', h.bname, 'at', h.ts) order by h.ts), '[]'::jsonb) into v_history from (
    select coalesce(r.confirmed_at, r.created_at) as ts, b.name as bname
    from redemptions r join businesses b on b.id = r.business_id
    where r.user_id = v_user and r.status = 'confirmed' and not r.loyalty_free
    order by coalesce(r.confirmed_at, r.created_at), r.id
    offset v_from
    limit case when v_card.id is not null then v_card.stamp_end - v_from else v_goal end
  ) h;

  select coalesce(jsonb_agg(jsonb_build_object(
      'completed_at', c.completed_at, 'status', case when c.status = 'used' then 'used' else 'expired' end,
      'closed_at', coalesce(c.closed_at, c.expires_at), 'benefit_name', be.name, 'business_name', b.name,
      'logo_url', b.logo_url, 'category', b.category) order by c.seq desc), '[]'::jsonb) into v_past
  from loyalty_cards c
  left join benefits be on be.id = c.chosen_benefit_id
  left join businesses b on b.id = be.business_id
  where c.user_id = v_user and c.status in ('used', 'expired');

  return jsonb_build_object(
    'stamps', v_stamps, 'goal', v_goal,
    'completed_at', v_card.completed_at, 'expires_at', v_card.expires_at, 'chosen_benefit_id', v_card.chosen_benefit_id,
    'options', v_options, 'history', v_history, 'past', v_past);
end;
$f$;
revoke execute on function my_camina_card() from public, anon;
grant execute on function my_camina_card() to authenticated;
