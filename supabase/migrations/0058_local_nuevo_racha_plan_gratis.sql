-- Tres mecánicas nuevas (todo con bloques $f$ para poder aplicarlo por la API):
--  1) Bono +5 Puntos por el primer canje confirmado en un local donde la persona nunca canjeó (solo locales Paso Firme / Paso Adelante).
--  2) Racha semanal: +5 Puntos por cada 7 días seguidos cumpliendo la meta (se cobra desde Actividad; una vez por bloque de 7 días).
--  3) Plan gratis (Primer Paso): primero 1 premio gratis; recién con un gratis activo se puede sumar 1 descuento (máx. 2 premios).

-- ---------- 1) Local nuevo ----------
alter table redemptions add column if not exists new_place_bonus integer not null default 0;

create or replace function new_place_bonus_points() returns integer as $f$
  select 5;
$f$ language sql immutable;

create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $f$
declare
  v_row redemptions;
  v_was_charged boolean;
  v_bname text;
  v_plan business_plan;
  v_bonus integer := new_place_bonus_points();
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;

  select * into v_row from redemptions
  where business_id = p_business_id and code = p_code
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Código no encontrado';
  end if;

  if v_row.status = 'confirmed' then
    raise exception 'Ese código ya fue confirmado';
  end if;

  if v_row.status <> 'pending' or v_row.code_expires_at < now() then
    update redemptions set status = 'expired' where id = v_row.id and status = 'pending';
    raise exception 'Ese código ya venció';
  end if;

  v_was_charged := v_row.points_charged;

  update redemptions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(), points_charged = true
  where id = v_row.id
  returning * into v_row;

  select name, plan into v_bname, v_plan from businesses where id = v_row.business_id;

  -- Los canjes viejos ya descontaron al generar el código; los nuevos se descuentan recién acá (salvo el gratis de la tarjeta).
  if not v_was_charged and v_row.cost_points > 0 then
    insert into points_ledger (user_id, amount, reason, note)
    values (v_row.user_id, -v_row.cost_points, 'redemption', 'Canje en ' || coalesce(v_bname, 'un comercio'));
  end if;

  -- Bono por probar un local nuevo: solo planes de pago, una vez por persona y local, y no para cuentas de prueba.
  if v_plan in ('paso_firme', 'paso_adelante')
     and not exists (select 1 from qa_accounts where user_id = v_row.user_id)
     and not exists (
       select 1 from redemptions r
       where r.user_id = v_row.user_id and r.business_id = v_row.business_id
         and r.status = 'confirmed' and r.id <> v_row.id
     ) then
    insert into points_ledger (user_id, amount, reason, expires_at, note)
    values (v_row.user_id, v_bonus, 'challenge', now() + (points_ttl_days() || ' days')::interval,
            'Primera vez en ' || coalesce(v_bname, 'un local'));
    update redemptions set new_place_bonus = v_bonus where id = v_row.id returning * into v_row;

    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (v_row.user_id, '¡+' || v_bonus || ' Puntos por probar un local nuevo! 🎉',
            'Es tu primera vez en ' || coalesce(v_bname, 'este local') || '. Te acreditamos ' || v_bonus || ' Puntos.',
            jsonb_build_object('type', 'new_place', 'business_id', v_row.business_id),
            'new_place:' || v_row.user_id || ':' || v_row.business_id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

-- ¿Este local da el bono a quien nunca canjeó acá? (para mostrarlo en la ficha del local)
create or replace function my_new_place_bonus(p_business_id uuid) returns integer as $f$
  select case
    when auth.uid() is null then 0
    when not exists (select 1 from businesses b where b.id = p_business_id and b.plan in ('paso_firme', 'paso_adelante')) then 0
    when exists (select 1 from redemptions r where r.user_id = auth.uid() and r.business_id = p_business_id and r.status = 'confirmed') then 0
    else new_place_bonus_points()
  end;
$f$ language sql stable security definer set search_path = public;
grant execute on function my_new_place_bonus(uuid) to authenticated;

-- ---------- 2) Racha semanal ----------
-- Cada cobro guarda los 7 días que cubre (block_start..block_end); un bloque nuevo no puede pisar días ya cobrados.
create table if not exists streak_claims (
  user_id uuid not null references profiles (id) on delete cascade,
  block_start date not null,
  block_end date not null,
  points integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, block_end),
  check (block_end = block_start + 6)
);
alter table streak_claims enable row level security;
drop policy if exists "streak_claims: select own" on streak_claims;
create policy "streak_claims: select own" on streak_claims for select using (auth.uid() = user_id);

create or replace function streak_bonus_points() returns integer as $f$
  select 5;
$f$ language sql immutable;

-- Racha actual: días seguidos (hasta hoy, o hasta ayer si hoy todavía no llega) con pasos >= meta de ese día (mínimo 1000).
create or replace function my_streak_state()
returns table (streak integer, streak_start date, blocks_done integer, blocks_claimed integer) as $f$
declare
  v_user uuid := auth.uid();
  v_day date := local_today();
  v_n integer := 0;
  v_met boolean;
begin
  if v_user is null then
    return;
  end if;
  select coalesce(sd.steps >= greatest(coalesce(sd.goal, (select daily_goal from profiles where id = v_user), 6000), 1000), false)
    into v_met from steps_daily sd where sd.user_id = v_user and sd.day = v_day;
  if not coalesce(v_met, false) then
    v_day := v_day - 1;
  end if;
  loop
    select coalesce(sd.steps >= greatest(coalesce(sd.goal, (select daily_goal from profiles where id = v_user), 6000), 1000), false)
      into v_met from steps_daily sd where sd.user_id = v_user and sd.day = v_day;
    exit when not coalesce(v_met, false) or v_n >= 400;
    v_n := v_n + 1;
    v_day := v_day - 1;
  end loop;
  streak := v_n;
  streak_start := case when v_n > 0 then v_day + 1 else null end;
  blocks_done := v_n / 7;
  blocks_claimed := case when v_n > 0
    then (select count(*)::integer from generate_series(1, v_n / 7) k
          where exists (select 1 from streak_claims c where c.user_id = v_user
                          and c.block_start <= my_streak_state.streak_start + 7 * k - 1
                          and c.block_end >= my_streak_state.streak_start + 7 * (k - 1)))
    else 0 end;
  return next;
end;
$f$ language plpgsql stable security definer set search_path = public;
grant execute on function my_streak_state() to authenticated;

-- Cobra los bloques de 7 días completados que todavía no se cobraron. Devuelve los Puntos acreditados (0 si no hay nada).
create or replace function claim_streak_bonus() returns integer as $f$
declare
  v_user uuid := auth.uid();
  s record;
  v_block integer;
  v_total integer := 0;
  v_pts integer := streak_bonus_points();
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('streak:' || v_user::text, 0));

  select * into s from my_streak_state();
  if s.streak_start is null or s.blocks_done < 1 then
    return 0;
  end if;

  for v_block in 1..s.blocks_done loop
    if not exists (select 1 from streak_claims c where c.user_id = v_user
                     and c.block_start <= s.streak_start + 7 * v_block - 1
                     and c.block_end >= s.streak_start + 7 * (v_block - 1)) then
      insert into streak_claims (user_id, block_start, block_end, points)
      values (v_user, s.streak_start + 7 * (v_block - 1), s.streak_start + 7 * v_block - 1, v_pts);
      insert into points_ledger (user_id, amount, reason, expires_at, note)
      values (v_user, v_pts, 'challenge', now() + (points_ttl_days() || ' days')::interval,
              'Racha de ' || (v_block * 7) || ' días');
      v_total := v_total + v_pts;
    end if;
  end loop;

  if v_total > 0 then
    insert into notifications_outbox (user_id, title, body, data, dedupe_key)
    values (v_user, '¡Racha de 7 días! 🔥', 'Sumaste ' || v_total || ' Puntos por tu racha.',
            jsonb_build_object('type', 'streak'), 'streak:' || v_user || ':' || (s.streak_start + 7 * s.blocks_done - 1))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return v_total;
end;
$f$ language plpgsql security definer set search_path = public;
grant execute on function claim_streak_bonus() to authenticated;

-- ---------- 3) Plan gratis: 1 gratis primero, después 1 descuento ----------
create or replace function enforce_benefit_plan_rules() returns trigger as $f$
declare
  plan business_plan;
  v_gratis integer;
  v_desc integer;
begin
  select b.plan into plan from businesses b where b.id = new.business_id;

  if plan = 'primer_paso' then
    if new.daily_quota is null or new.daily_quota < 3 then
      raise exception 'El plan Primer Paso requiere un mínimo de 3 cupones por día';
    end if;
    if new.active then
      select count(*) filter (where type = 'gratis'), count(*) filter (where type = 'descuento')
        into v_gratis, v_desc
      from benefits
      where business_id = new.business_id and active and id <> coalesce(new.id, gen_random_uuid());
      if new.type = 'gratis' then
        if v_gratis >= 1 then
          raise exception 'El plan Primer Paso permite un solo premio gratis';
        end if;
      else
        if v_gratis < 1 then
          raise exception 'Primero creá un premio gratis: el descuento se habilita después';
        end if;
        if v_desc >= 1 then
          raise exception 'El plan Primer Paso permite un solo descuento';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$f$ language plpgsql set search_path = public;

revoke execute on function new_place_bonus_points(), streak_bonus_points() from public, anon, authenticated;
revoke execute on function my_new_place_bonus(uuid) from public, anon;
revoke execute on function my_streak_state() from public, anon;
revoke execute on function claim_streak_bonus() from public, anon;
