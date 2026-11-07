-- Grupos: desafío "Ruta del mes", tarjeta del desafío en el chat y aviso de cada mensaje del chat.
--   1) Nueva regla de desafío 'ruta': gana quien visita más locales de su Ruta del mes durante el desafío.
--   2) El chat del grupo puede tener tarjetas del sistema (kind): al crear un desafío aparece en el chat
--      con su botón para sumarse. La gente solo puede escribir mensajes comunes (kind = 'text').
--   3) Cada mensaje del chat avisa a los demás: "Ana te mandó un mensaje". Como mucho un aviso por minuto
--      por grupo para cada persona, y nunca a quien la bloqueó.

-- ---------- 1) Regla 'ruta' ----------
alter table group_challenges drop constraint if exists group_challenges_rule_check;
alter table group_challenges add constraint group_challenges_rule_check check (rule in ('steps', 'days', 'streak', 'ruta'));
alter table group_challenge_results add column if not exists ruta_visits integer not null default 0;

-- Locales de la Ruta confirmados por persona entre dos días (hora de Bolivia).
create or replace function _ruta_visits_between(p_user uuid, p_from date, p_to date) returns integer as $f$
  select count(*)::int from route_visits v
  where v.user_id = p_user and v.status = 'confirmed'
    and (coalesce(v.decided_at, v.created_at) at time zone 'America/La_Paz')::date between p_from and p_to;
$f$ language sql stable security definer set search_path = public;
revoke execute on function _ruta_visits_between(uuid, date, date) from public, anon, authenticated;

-- El avance suma una columna: cambia lo que devuelve, por eso se borra y se vuelve a crear.
drop function if exists challenge_progress(uuid);
create function challenge_progress(p_challenge uuid)
returns table(user_id uuid, steps integer, goal_days integer, best_streak integer, met_goal boolean, ruta_visits integer)
language plpgsql stable security definer set search_path to 'public' as $function$
#variable_conflict use_column
declare
  c group_challenges;
  v_total_days integer;
  v_min_days integer;
begin
  select * into c from group_challenges where id = p_challenge;
  if c.id is null or not exists (select 1 from group_members where group_id = c.group_id and user_id = auth.uid()) then
    return;
  end if;
  v_total_days := c.end_day - c.start_day + 1;
  v_min_days := ceil(v_total_days * 0.8)::int;
  return query
  with days as (
    select e.user_id as uid, d::date as day,
           coalesce((select s.steps from steps_daily s where s.user_id = e.user_id and s.day = d::date), 0) as steps
    from group_challenge_entries e, generate_series(c.start_day, c.end_day, interval '1 day') d
    where e.challenge_id = p_challenge
  ), flagged as (
    select uid, day, steps, (steps >= c.daily_goal) as ok,
           day - (row_number() over (partition by uid, (steps >= c.daily_goal) order by day))::int as grp
    from days
  ), streaks as (
    select uid, count(*)::int as len from flagged where ok group by uid, grp
  )
  select f.uid, sum(f.steps)::int, count(*) filter (where f.ok)::int,
         coalesce((select max(len) from streaks s where s.uid = f.uid), 0),
         case when c.rule = 'ruta' then _ruta_visits_between(f.uid, c.start_day, c.end_day) >= 1
              else count(*) filter (where f.ok) >= v_min_days end,
         _ruta_visits_between(f.uid, c.start_day, c.end_day)
  from flagged f group by f.uid;
end;
$function$;
revoke execute on function challenge_progress(uuid) from public, anon;
grant execute on function challenge_progress(uuid) to authenticated;

-- Cierre de desafíos: igual que antes, más la regla 'ruta' (cumple quien visitó al menos 1 local de su Ruta;
-- gana quien visitó más; si empatan, quien caminó más).
create or replace function settle_group_challenges() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare
  c group_challenges;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_pot integer;
  v_winners integer;
  v_share integer;
  v_half integer;
  v_min integer;
  v_done integer := 0;
  v_gname text;
  v_ttl interval := (points_ttl_days() || ' days')::interval;
begin
  for c in select * from group_challenges where status = 'active' and end_day < v_today for update loop
    create temp table if not exists _ch_res (uid uuid, steps int, goal_days int, best_streak int, met boolean, rnk int, fin date, pos int, rv int) on commit drop;
    delete from _ch_res;
    v_min := ceil(((c.end_day - c.start_day + 1) * 0.8))::int;
    insert into _ch_res (uid, steps, goal_days, best_streak, met, fin, rv)
    with days as (
      select e.user_id as uid, d::date as day,
             coalesce((select s.steps from steps_daily s where s.user_id = e.user_id and s.day = d::date), 0) as steps
      from group_challenge_entries e, generate_series(c.start_day, c.end_day, interval '1 day') d
      where e.challenge_id = c.id
    ), flagged as (
      select uid, day, steps, (steps >= c.daily_goal) as ok,
             day - (row_number() over (partition by uid, (steps >= c.daily_goal) order by day))::int as grp
      from days
    ), streaks as (
      select uid, count(*)::int as len from flagged where ok group by uid, grp
    )
    select f.uid, sum(f.steps)::int, (count(*) filter (where f.ok))::int,
           coalesce((select max(len) from streaks s where s.uid = f.uid), 0),
           case when c.rule = 'ruta' then _ruta_visits_between(f.uid, c.start_day, c.end_day) >= 1
                else (count(*) filter (where f.ok)) >= v_min end,
           case when c.rule = 'ruta' then
             -- día de su primera visita confirmada dentro del desafío
             (select min((coalesce(v.decided_at, v.created_at) at time zone 'America/La_Paz')::date) from route_visits v
              where v.user_id = f.uid and v.status = 'confirmed'
                and (coalesce(v.decided_at, v.created_at) at time zone 'America/La_Paz')::date between c.start_day and c.end_day)
           else
             (select x.day from (select f2.day, row_number() over (order by f2.day) as n from flagged f2 where f2.uid = f.uid and f2.ok) x where x.n = v_min)
           end,
           _ruta_visits_between(f.uid, c.start_day, c.end_day)
    from flagged f group by f.uid;

    update _ch_res r set rnk = t.rn from (
      select uid, row_number() over (
        order by case c.rule when 'steps' then steps when 'days' then goal_days when 'ruta' then rv else best_streak end desc, steps desc
      ) as rn from _ch_res
    ) t where t.uid = r.uid;

    -- Orden de llegada entre quienes cumplen. En la Ruta manda quién visitó más locales; después, quién llegó antes.
    update _ch_res r set pos = t.p from (
      select uid, row_number() over (order by case when c.rule = 'ruta' then rnk else 0 end, fin, rnk) as p from _ch_res where met
    ) t where t.uid = r.uid;

    select coalesce(sum(stake_paid), 0) into v_pot from group_challenge_entries where challenge_id = c.id;
    select count(*) into v_winners from _ch_res where met;
    v_half := v_pot - v_pot / 2;
    v_share := case when v_winners > 1 then (v_pot - v_half) / (v_winners - 1) else 0 end;

    insert into group_challenge_results (challenge_id, user_id, steps, goal_days, best_streak, met_goal, rank, payout, finish_day, finish_pos, ruta_visits)
    select c.id, r.uid, r.steps, r.goal_days, r.best_streak, r.met, r.rnk,
           case when not r.met then 0
                when v_winners = 1 then v_pot
                when r.pos = 1 then v_half
                when r.pos = 2 then v_share + ((v_pot - v_half) - v_share * (v_winners - 1))
                else v_share end,
           r.fin, r.pos, r.rv
    from _ch_res r;

    if v_winners > 0 then
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      select user_id, payout, 'challenge', now() + v_ttl, 'Ganaste «' || c.name || '»' from group_challenge_results where challenge_id = c.id and payout > 0;
    else
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      select user_id, stake_paid, 'challenge', now() + v_ttl, 'Te devolvimos lo que pusiste en «' || c.name || '»' from group_challenge_entries where challenge_id = c.id and stake_paid > 0;
    end if;

    select name into v_gname from groups where id = c.group_id;
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    select res.user_id, 'Terminó "' || c.name || '" 🏁',
           case when res.finish_pos = 1 and res.payout > 0 then '¡Llegaste primero! Ganaste ' || res.payout || ' puntos en ' || v_gname || '.'
                when res.payout > 0 then '¡Ganaste ' || res.payout || ' puntos! Quedaste #' || res.rank || ' en ' || v_gname || '.'
                when res.met_goal then 'Cumpliste la meta. Quedaste #' || res.rank || ' en ' || v_gname || '.'
                else 'Quedaste #' || res.rank || ' en ' || v_gname || '. ¡Vas por la próxima!' end,
           jsonb_build_object('type', 'group_challenge_end', 'group_id', c.group_id), 'gchend:' || c.id || ':' || res.user_id
    from group_challenge_results res where res.challenge_id = c.id
    on conflict (dedupe_key) where dedupe_key is not null do nothing;

    update group_challenges set status = 'finished', settled_at = now() where id = c.id;
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$function$;

-- ---------- 2) Tarjetas del sistema en el chat ----------
alter table group_notes add column if not exists kind text not null default 'text';
alter table group_notes add column if not exists challenge_id uuid references group_challenges(id) on delete cascade;
alter table group_notes drop constraint if exists group_notes_kind_check;
alter table group_notes add constraint group_notes_kind_check check (kind in ('text', 'challenge'));
-- Desde la app solo se escriben mensajes comunes; las tarjetas las pone la base.
alter policy "group_notes: members write" on group_notes
  with check ((auth.uid() = user_id) and is_group_member(group_id) and kind = 'text' and challenge_id is null);

-- Crear desafío: igual que antes (aviso a todos), más la tarjeta en el chat. Para un desafío 'ruta' la app
-- anota en la Ruta del mes a quien lo crea o se suma, si todavía no estaba.
create or replace function create_group_challenge(p_group uuid, p_name text, p_rule text, p_daily_goal integer, p_start date, p_end date, p_stake integer)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_id uuid;
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_gname text;
  v_rule_txt text;
begin
  if auth.uid() is null or not exists (select 1 from group_members where group_id = p_group and user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
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

  insert into group_notes (group_id, user_id, text, kind, challenge_id)
  values (p_group, auth.uid(), btrim(p_name), 'challenge', v_id);

  v_rule_txt := case p_rule when 'ruta' then 'Ruta del mes: gana quien visita más locales.'
                            when 'days' then 'Gana quien cumple la meta más días.'
                            when 'streak' then 'Gana la mejor racha.'
                            else 'Gana quien suma más pasos.' end;
  select name into v_gname from groups where id = p_group;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select m.user_id, 'Nuevo desafío en ' || v_gname || ' 🏆',
         '"' || btrim(p_name) || '". ' || v_rule_txt || ' Entra y súmate.',
         jsonb_build_object('type', 'group_challenge', 'group_id', p_group), 'gch:' || v_id || ':' || m.user_id
  from group_members m where m.group_id = p_group and m.user_id <> auth.uid()
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return v_id;
end;
$function$;

-- ---------- 3) Aviso de cada mensaje del chat ----------
create or replace function _avisar_mensaje_grupo() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_gname text;
  v_from text;
begin
  if new.kind <> 'text' then return new; end if;
  select name into v_gname from groups where id = new.group_id;
  select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'Alguien') into v_from from profiles where id = new.user_id;
  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  select m.user_id,
         v_from || ' te mandó un mensaje',
         'En ' || v_gname || ': ' || left(new.text, 90) || case when char_length(new.text) > 90 then '…' else '' end,
         jsonb_build_object('type', 'group_note', 'group_id', new.group_id),
         'gnote:' || new.id || ':' || m.user_id
  from group_members m
  where m.group_id = new.group_id and m.user_id <> new.user_id
    and not users_blocked(m.user_id, new.user_id)
    -- como mucho un aviso por minuto de este grupo para cada persona
    and not exists (select 1 from notifications_outbox o
                    where o.user_id = m.user_id and o.data->>'type' = 'group_note' and o.data->>'group_id' = new.group_id::text
                      and o.created_at > now() - interval '1 minute')
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$function$;
revoke execute on function _avisar_mensaje_grupo() from public, anon, authenticated;

drop trigger if exists avisar_mensaje_grupo on group_notes;
create trigger avisar_mensaje_grupo after insert on group_notes for each row execute function _avisar_mensaje_grupo();
