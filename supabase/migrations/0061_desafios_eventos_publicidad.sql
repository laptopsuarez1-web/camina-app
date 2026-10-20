-- Desafíos, eventos y publicidad de comercios (extiende promotions, 0025).
--   * kind: evento | sorteo (viejo) | desafio | publicidad
--   * meta: pasos por día o pasos en total (goal_mode / goal_steps / goal_days)
--   * fondo de la tarjeta: color de Camina o foto (bg_color / bg_image_url, la app la oscurece sola)
--   * los pasos de un desafío cuentan desde el día en que la persona toca "Participar"
--   * paquetes: Bs 400 cuenta solo publicidad (banner, evento o desafío); comercio con local +Bs 200, solo evento o desafío
-- No cambia nada de lo que ya existe: request_promotion (0025) sigue funcionando igual.

alter table promotions drop constraint if exists promotions_kind_check;
alter table promotions add constraint promotions_kind_check check (kind in ('evento', 'sorteo', 'desafio', 'publicidad'));

-- La vigencia máxima de 14 días (0025) pasa a 30 para desafíos y publicidad; request_promotion_v2 la controla por tipo.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'promotions'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%14 days%'
  loop
    execute format('alter table promotions drop constraint %I', c.conname);
  end loop;
end $$;
alter table promotions drop constraint if exists promotions_window_chk;
alter table promotions add constraint promotions_window_chk check (ends_at > starts_at and ends_at <= starts_at + interval '30 days');

alter table promotions add column if not exists goal_mode text check (goal_mode in ('daily', 'total'));
alter table promotions add column if not exists goal_steps integer check (goal_steps is null or goal_steps between 1000 and 1000000);
alter table promotions add column if not exists goal_days integer check (goal_days is null or goal_days between 1 and 30);
alter table promotions add column if not exists bg_color text check (bg_color is null or bg_color in ('violeta', 'menta', 'dorado', 'noche', 'coral'));
alter table promotions add column if not exists bg_image_url text check (bg_image_url is null or char_length(bg_image_url) <= 500);
alter table promotions add column if not exists cta_url text check (cta_url is null or char_length(cta_url) <= 300);
alter table promotions drop constraint if exists promotions_goal_chk;
alter table promotions add constraint promotions_goal_chk check (
  (goal_mode is null and goal_steps is null and goal_days is null)
  or (goal_mode = 'daily' and goal_steps is not null and goal_days is not null)
  or (goal_mode = 'total' and goal_steps is not null and goal_days is null)
);

-- ¿Cumplió la persona la meta? Con meta nueva: cuenta desde el día en que se anotó (zona La Paz).
-- Sin meta nueva queda la regla vieja (req_steps / req_days desde el inicio).
create or replace function _promotion_eligible(r promotions, p_user uuid) returns boolean as $$
declare
  v_from date;
  v_to date := (r.ends_at at time zone 'America/La_Paz')::date;
begin
  if r.goal_mode is null then
    return r.req_steps is null or (
      select count(*) from steps_daily s
      where s.user_id = p_user
        and s.day >= (r.starts_at at time zone 'America/La_Paz')::date
        and s.day <= v_to
        and s.steps >= r.req_steps
    ) >= r.req_days;
  end if;
  select greatest((e.joined_at at time zone 'America/La_Paz')::date, (r.starts_at at time zone 'America/La_Paz')::date)
    into v_from from promotion_entries e where e.promotion_id = r.id and e.user_id = p_user;
  if v_from is null then
    return false;
  end if;
  if r.goal_mode = 'daily' then
    return (select count(*) from steps_daily s
            where s.user_id = p_user and s.day between v_from and v_to and s.steps >= r.goal_steps) >= r.goal_days;
  end if;
  return coalesce((select sum(s.steps) from steps_daily s
                   where s.user_id = p_user and s.day between v_from and v_to), 0) >= r.goal_steps;
end;
$$ language plpgsql stable security definer set search_path = public;
revoke execute on function _promotion_eligible(promotions, uuid) from public, anon, authenticated;

-- Pedido de publicación con todo lo que elige el comercio.
create or replace function request_promotion_v2(
  p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_goal_mode text, p_goal_steps integer, p_goal_days integer, p_winners integer,
  p_bg_color text, p_bg_image_url text, p_cta_url text
) returns promotions as $$
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
    raise exception 'Elegí si es un evento, un desafío o publicidad.';
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
      raise exception 'Elegí la meta del desafío.';
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
    raise exception 'Poné el link al que lleva la publicidad (empieza con https://).';
  end if;
  if p_kind <> 'publicidad' and p_cta_url is not null then
    raise exception 'Solo la publicidad lleva link.';
  end if;
  insert into promotions (
    business_id, kind, title, description, prize, winners_count, starts_at, ends_at,
    goal_mode, goal_steps, goal_days, bg_color, bg_image_url, cta_url, price_bs
  ) values (
    p_business_id, p_kind, btrim(p_title), btrim(p_description), nullif(btrim(coalesce(p_prize, '')), ''),
    least(greatest(coalesce(p_winners, 1), 1), 10), p_starts_at, p_ends_at,
    case when p_kind = 'desafio' then p_goal_mode end,
    case when p_kind = 'desafio' then p_goal_steps end,
    case when p_kind = 'desafio' and p_goal_mode = 'daily' then p_goal_days end,
    coalesce(p_bg_color, 'violeta'), nullif(btrim(coalesce(p_bg_image_url, '')), ''),
    nullif(btrim(coalesce(p_cta_url, '')), ''), promotion_price(b.account_kind)
  ) returning * into r;
  return r;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function request_promotion_v2(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text) from public, anon;
grant execute on function request_promotion_v2(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text) to authenticated;

-- Participar: la publicidad no se "participa"; a un evento se puede anotar antes de que empiece; el momento de anotarse
-- queda guardado (joined_at) y es desde donde cuentan los pasos de un desafío.
create or replace function join_promotion(p_id uuid) returns void as $$
declare
  r promotions;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from promotions where id = p_id and status = 'approved';
  if r.id is null or now() > r.ends_at or r.kind = 'publicidad' or (now() < r.starts_at and r.kind <> 'evento') then
    raise exception 'Esta publicación no está vigente.';
  end if;
  insert into promotion_entries (promotion_id, user_id) values (p_id, auth.uid())
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- Cuánta gente participa (la tabla de anotados solo la ve cada persona).
create or replace function promotion_counts() returns table (promotion_id uuid, participants integer) as $$
  select e.promotion_id, count(*)::integer
  from promotion_entries e join promotions p on p.id = e.promotion_id
  where p.status in ('approved', 'finished')
  group by e.promotion_id;
$$ language sql stable security definer set search_path = public;
revoke execute on function promotion_counts() from public, anon;
grant execute on function promotion_counts() to authenticated;

-- Mi avance en un desafío (desde que me anoté).
create or replace function my_promotion_progress(p_id uuid) returns table (steps_total integer, days_met integer) as $$
declare
  r promotions;
  v_from date;
begin
  select * into r from promotions where id = p_id and status in ('approved', 'finished');
  select greatest((e.joined_at at time zone 'America/La_Paz')::date, (r.starts_at at time zone 'America/La_Paz')::date)
    into v_from from promotion_entries e where e.promotion_id = p_id and e.user_id = auth.uid();
  if r.id is null or v_from is null then
    return query select 0, 0;
    return;
  end if;
  return query
    select coalesce(sum(s.steps), 0)::integer,
           (count(*) filter (where r.goal_steps is not null and s.steps >= r.goal_steps))::integer
    from steps_daily s
    where s.user_id = auth.uid() and s.day between v_from and (r.ends_at at time zone 'America/La_Paz')::date;
end;
$$ language plpgsql stable security definer set search_path = public;
revoke execute on function my_promotion_progress(uuid) from public, anon;
grant execute on function my_promotion_progress(uuid) to authenticated;
