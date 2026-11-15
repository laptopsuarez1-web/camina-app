-- 0121: Aplausos en el grupo y Leyenda del local (ideas de Strava: «kudos» y «Local Legend»).
--
-- Aplausos: cada integrante puede aplaudir a otro del mismo grupo una vez por día. Al que recibe le llega un aviso.
-- Leyenda del local: quien más visitó un local en el mes (canjes confirmados + visitas confirmadas de la Ruta).
-- Su nombre solo se muestra si tiene activado aparecer en el ranking; si no, sale como «Un caminante».

create table if not exists public.group_cheers (
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (group_id, from_user, to_user, day),
  check (from_user <> to_user)
);
create index if not exists group_cheers_to_idx on public.group_cheers (group_id, to_user, day);
alter table public.group_cheers enable row level security;
-- Sin políticas: se lee y se escribe solo con las funciones de abajo.

-- Aplaudir a un compañero (una vez por día). Devuelve cuántos aplausos lleva hoy.
create or replace function public.cheer_member(p_group uuid, p_to uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_count integer;
  v_inserted integer;
  v_name text;
  v_group text;
begin
  if v_me is null then raise exception 'No autorizado'; end if;
  if v_me = p_to then raise exception 'No puedes aplaudirte'; end if;
  if not exists (select 1 from group_members where group_id = p_group and user_id = v_me)
     or not exists (select 1 from group_members where group_id = p_group and user_id = p_to) then
    raise exception 'No autorizado';
  end if;
  if exists (select 1 from user_blocks where (blocker_id = v_me and blocked_id = p_to) or (blocker_id = p_to and blocked_id = v_me)) then
    raise exception 'No autorizado';
  end if;

  insert into group_cheers (group_id, from_user, to_user, day) values (p_group, v_me, p_to, v_today)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    select split_part(coalesce(full_name, 'Alguien'), ' ', 1) into v_name from profiles where id = v_me;
    select name into v_group from groups where id = p_group;
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (p_to, v_name || ' te aplaudió 👏', 'En ' || v_group || '. ¡Sigue así!',
            jsonb_build_object('type', 'group_cheer', 'group_id', p_group),
            'cheer:' || p_group || ':' || v_me || ':' || p_to || ':' || v_today)
    on conflict do nothing;
  end if;

  select count(*) into v_count from group_cheers where group_id = p_group and to_user = p_to and day = v_today;
  return v_count;
end;
$$;

-- Aplausos de hoy en el grupo: por integrante, cuántos recibió y si yo ya lo aplaudí.
create or replace function public.group_cheers_today(p_group uuid)
returns table (to_user uuid, cheers integer, mine boolean)
language sql
security definer
set search_path to 'public'
stable
as $$
  select c.to_user, count(*)::int, bool_or(c.from_user = auth.uid())
  from group_cheers c
  where c.group_id = p_group
    and c.day = (now() at time zone 'America/La_Paz')::date
    and exists (select 1 from group_members m where m.group_id = p_group and m.user_id = auth.uid())
  group by c.to_user;
$$;

-- Leyenda del local este mes, y cuántas visitas llevo yo.
create or replace function public.business_legend(p_business uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  v_month date := date_trunc('month', (now() at time zone 'America/La_Paz'))::date;
  v_from timestamptz := (v_month::timestamp at time zone 'America/La_Paz');
  v_top record;
  v_mine integer;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;

  with visits as (
    select user_id, confirmed_at as at from redemptions
    where business_id = p_business and status = 'confirmed' and confirmed_at >= v_from
    union all
    select user_id, coalesce(decided_at, created_at) from route_visits
    where business_id = p_business and status = 'confirmed' and month = v_month
  ), counted as (
    select user_id, count(*)::int as n, max(at) as last_at from visits group by user_id
  )
  select c.user_id, c.n, p.full_name, coalesce(p.ranking_visible, true) as visible
    into v_top
  from counted c join profiles p on p.id = c.user_id
  where coalesce(p.suspended, false) = false
  order by c.n desc, c.last_at asc
  limit 1;

  select count(*) into v_mine from (
    select 1 from redemptions where business_id = p_business and user_id = auth.uid() and status = 'confirmed' and confirmed_at >= v_from
    union all
    select 1 from route_visits where business_id = p_business and user_id = auth.uid() and status = 'confirmed' and month = v_month
  ) x;

  return jsonb_build_object(
    'month', v_month,
    'visits', coalesce(v_top.n, 0),
    'name', case when v_top.user_id is null then null
                 when v_top.user_id = auth.uid() then split_part(coalesce(v_top.full_name, 'Tú'), ' ', 1)
                 when v_top.visible then split_part(coalesce(v_top.full_name, 'Un caminante'), ' ', 1)
                 else 'Un caminante' end,
    'is_me', coalesce(v_top.user_id = auth.uid(), false),
    'my_visits', v_mine
  );
end;
$$;

revoke all on function public.cheer_member(uuid, uuid) from public, anon;
revoke all on function public.group_cheers_today(uuid) from public, anon;
revoke all on function public.business_legend(uuid) from public, anon;
grant execute on function public.cheer_member(uuid, uuid) to authenticated;
grant execute on function public.group_cheers_today(uuid) to authenticated;
grant execute on function public.business_legend(uuid) to authenticated;
