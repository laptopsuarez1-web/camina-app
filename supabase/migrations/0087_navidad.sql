-- Navidad en Camina (temporada). Todo lo navideño de la app se prende y se apaga solo con las fechas de esta tabla,
-- sin hacer otra build:
--   * app_seasons: la temporada "navidad" (fechas + ajustes del árbol). La app pregunta con season_now().
--   * app_season_testers: personas que ven la temporada antes de que empiece (para probarla en su teléfono).
--   * global_double_days: días dobles para TODOS (el Aguinaldo del 25 de diciembre). Usa el mismo Día doble de la
--     Ruta del mes: 1 Punto cada 500 pasos y tope 40. is_double_day() ahora mira también esta tabla.
--   * Árbol del grupo: 24 luces, una por día (1 al 24 de diciembre). La luz de un día se enciende si al menos la mitad
--     del grupo cumplió su meta ese día. Con tree_goal luces el árbol queda encendido (estrella). Vale para todos los
--     grupos, los que ya existen y los que se creen en diciembre. No da Puntos.

-- ---------- 1) Tablas ----------
create table if not exists app_seasons (
  key text primary key,
  starts_on date not null,
  ends_on date not null,
  config jsonb not null default '{}'::jsonb,
  check (ends_on >= starts_on)
);
alter table app_seasons enable row level security;  -- sin políticas: se lee solo con season_now()

create table if not exists app_season_testers (
  user_id uuid primary key references profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table app_season_testers enable row level security;

create table if not exists global_double_days (
  day date primary key,
  label text not null
);
alter table global_double_days enable row level security;

insert into app_seasons (key, starts_on, ends_on, config)
values ('navidad', '2026-12-01', '2026-12-31', '{"tree_from": "2026-12-01", "tree_to": "2026-12-24", "tree_goal": 18}')
on conflict (key) do nothing;

insert into global_double_days (day, label) values ('2026-12-25', 'Aguinaldo de Camina')
on conflict (day) do nothing;

-- ---------- 2) Temporada activa ----------
-- La temporada que vale hoy para esta persona: la de las fechas de hoy o, si es probador, la próxima que todavía no terminó.
create or replace function active_season(p_user uuid) returns app_seasons as $f$
  select s.* from app_seasons s
  where local_today() <= s.ends_on
    and (local_today() >= s.starts_on or exists (select 1 from app_season_testers t where t.user_id = p_user))
  order by s.starts_on
  limit 1;
$f$ language sql stable security definer set search_path = public;

-- Lo que la app necesita saber: qué temporada hay, si es vista previa y el próximo día doble para todos.
create or replace function season_now() returns jsonb as $f$
declare
  s app_seasons;
  v_today date := local_today();
  d global_double_days;
begin
  if auth.uid() is null then return null; end if;
  s := active_season(auth.uid());
  if s.key is null then return null; end if;
  select * into d from global_double_days where day >= v_today and day <= s.ends_on + 7 order by day limit 1;
  return jsonb_build_object(
    'key', s.key,
    'starts_on', s.starts_on,
    'ends_on', s.ends_on,
    'preview', v_today < s.starts_on,
    'double_day', case when d.day is null then null else jsonb_build_object('day', d.day, 'label', d.label, 'today', d.day = v_today) end
  );
end;
$f$ language plpgsql stable security definer set search_path = public;

-- ---------- 3) Aguinaldo: días dobles para todos ----------
create or replace function is_double_day(p_user uuid, p_day date) returns boolean as $f$
  select exists (select 1 from route_participants where user_id = p_user and double_day = p_day and completed_at is not null)
      or exists (select 1 from global_double_days where day = p_day);
$f$ language sql stable security definer set search_path = public;

-- ---------- 4) Árbol del grupo ----------
create or replace function group_tree(p_group uuid) returns jsonb as $f$
declare
  v_user uuid := auth.uid();
  s app_seasons;
  v_from date;
  v_to date;
  v_goal integer;
  v_n integer;
  v_need integer;
  v_today date := local_today();
  v_days jsonb;
  v_lit integer;
  v_today_met uuid[];
begin
  if v_user is null or not exists (select 1 from group_members where group_id = p_group and user_id = v_user) then
    return null;
  end if;
  s := active_season(v_user);
  if s.key is distinct from 'navidad' then return null; end if;
  v_from := coalesce((s.config->>'tree_from')::date, s.starts_on);
  v_to := coalesce((s.config->>'tree_to')::date, s.ends_on);
  v_goal := coalesce((s.config->>'tree_goal')::int, 18);
  select count(*) into v_n from group_members where group_id = p_group;
  v_need := greatest(1, ceil(v_n / 2.0)::int);

  with days as (
    select d::date as day from generate_series(v_from, v_to, interval '1 day') d
  ), met as (
    select dd.day,
           count(sd.user_id) filter (where sd.steps >= greatest(coalesce(nullif(sd.goal, 0), p.daily_goal), 1000))::int as met
    from days dd
    cross join group_members m
    join profiles p on p.id = m.user_id
    left join steps_daily sd on sd.user_id = m.user_id and sd.day = dd.day
    where m.group_id = p_group
    group by dd.day
  )
  select jsonb_agg(jsonb_build_object('day', day, 'met', met, 'lit', day <= v_today and met >= v_need) order by day),
         count(*) filter (where day <= v_today and met >= v_need)::int
    into v_days, v_lit
  from met;

  select coalesce(array_agg(m.user_id), '{}') into v_today_met
  from group_members m
  join profiles p on p.id = m.user_id
  join steps_daily sd on sd.user_id = m.user_id and sd.day = v_today
  where m.group_id = p_group
    and sd.steps >= greatest(coalesce(nullif(sd.goal, 0), p.daily_goal), 1000);

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'goal', v_goal,
    'members', v_n,
    'need', v_need,
    'lights', jsonb_array_length(v_days),
    'lit', v_lit,
    'complete', v_lit >= v_goal,
    'days', v_days,
    'today', case when v_today between v_from and v_to
                  then jsonb_build_object('day', v_today, 'met', cardinality(v_today_met), 'need', v_need,
                                          'lit', cardinality(v_today_met) >= v_need, 'met_ids', to_jsonb(v_today_met))
                  else null end
  );
end;
$f$ language plpgsql stable security definer set search_path = public;

-- Los árboles de todos mis grupos (para la lista de Grupos).
create or replace function my_group_trees() returns jsonb as $f$
  select coalesce(jsonb_agg(jsonb_build_object('group_id', m.group_id, 'tree', t.tree)), '[]'::jsonb)
  from group_members m
  cross join lateral (select group_tree(m.group_id) as tree) t
  where m.user_id = auth.uid() and t.tree is not null;
$f$ language sql stable security definer set search_path = public;

-- ---------- 5) Permisos ----------
revoke execute on function active_season(uuid), is_double_day(uuid, date) from public, anon, authenticated;
revoke execute on function season_now(), group_tree(uuid), my_group_trees() from public, anon;
grant execute on function season_now(), group_tree(uuid), my_group_trees() to authenticated;
