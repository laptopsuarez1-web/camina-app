-- 0060 — Premios online: el local no necesita estar en el mapa ni tener página web
--
-- Decisión de Suarez (2026-10-20): una tienda online (WhatsApp / Instagram / Facebook / TikTok / web) ofrece un premio
-- con una cantidad fija de cupos. Cada canje genera su propio código de 6 números (distinto por persona); la persona se
-- lo manda a la tienda por su canal y la tienda lo confirma en su panel cuando quiera, igual que hoy.
--
-- Qué agrega:
-- - benefits.online: el premio es online (sin horario ni días; no hace falta estar en el local).
-- - benefits.online_channel: por dónde se cobra: 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'web'. El contacto sale de
--   los datos del local (teléfono, usuario o página), no se carga dos veces.
-- - benefits.online_quota: cupos TOTALES del premio (null = sin límite). Se cuentan canjes pendientes + confirmados.
-- - online_code_ttl_days(): vigencia del código de un premio online: 7 días (los comunes siguen en 15 minutos).
-- - redeem_benefit (de la 0057) con: sin horario/día para online, cupo total, vigencia de 7 días y código único entre pendientes del local.
-- - regenerate_redemption_code (de la 0054): si el canje es de un premio online, renueva por 7 días.
-- - benefits_online_redeemed(): cuántos cupos ya se usaron por premio online (para mostrar "Quedan X" sin exponer canjes ajenos).
-- La confirmación del local (confirm_redemption_code) NO cambia; el panel de canjes sigue igual.
-- Idempotente: sí. Se revierte volviendo a aplicar redeem_benefit (0057) y regenerate_redemption_code (0054); las columnas pueden quedar sin uso.

alter table benefits add column if not exists online boolean not null default false;
alter table benefits add column if not exists online_channel text check (online_channel in ('whatsapp', 'instagram', 'facebook', 'tiktok', 'web'));
alter table benefits add column if not exists online_quota integer check (online_quota is null or online_quota > 0);
alter table benefits drop constraint if exists benefits_online_has_channel;
alter table benefits add constraint benefits_online_has_channel check (not online or online_channel is not null);

create or replace function online_code_ttl_days() returns integer
language sql immutable set search_path = public
as $f$ select 7 $f$;
revoke execute on function online_code_ttl_days() from public, anon, authenticated;

create or replace function redeem_benefit(p_benefit_id uuid) returns redemptions as $f$
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

  if not v_benefit.online then
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
  end if;

  if not v_qa then
    select max(created_at) into v_cooldown_until
    from redemptions
    where user_id = v_user
      and business_id = v_benefit.business_id
      and status in ('pending', 'confirmed')
      and created_at > v_now - (business_redemption_cooldown_days() || ' days')::interval;
    if v_cooldown_until is not null then
      raise exception 'Ya canjeaste en este comercio hace menos de % días', business_redemption_cooldown_days();
    end if;

    if v_benefit.online then
      -- Premio online: los cupos son totales (no por día) y no hay horario.
      if v_benefit.online_quota is not null and (select count(*) from redemptions
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

  -- Tarjeta de fidelidad: con la tarjeta completa, el premio de fidelidad sale gratis (0 Puntos).
  v_cost := v_benefit.cost_points;
  if loyalty_enabled(v_benefit.business_id)
     and exists (select 1 from businesses where id = v_benefit.business_id and loyalty_benefit_id = v_benefit.id)
     and loyalty_stamps(v_user, v_benefit.business_id) >= loyalty_goal() then
    v_free := true;
    v_cost := 0;
  end if;

  v_balance := user_points_balance(v_user) - user_points_reserved(v_user);
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente';
  end if;

  -- Los Puntos NO se descuentan acá: se reservan mientras el código está vigente y se descuentan cuando el local lo confirma.

  -- Premio online: el código vale 7 días (el pago por WhatsApp o redes puede tardar) y es único entre los pendientes del local.
  v_ttl := case when v_benefit.online then (online_code_ttl_days() || ' days')::interval
                else (redemption_code_ttl_minutes() || ' minutes')::interval end;
  loop
    v_code := generate_redemption_code();
    exit when not exists (
      select 1 from redemptions where business_id = v_benefit.business_id and code = v_code and status = 'pending'
    ) or v_tries >= 20;
    v_tries := v_tries + 1;
  end loop;

  insert into redemptions (user_id, benefit_id, business_id, cost_points, points_charged, loyalty_free, code, code_expires_at)
  values (
    v_user, p_benefit_id, v_benefit.business_id, v_cost, false, v_free,
    v_code, v_now + v_ttl
  )
  returning * into v_row;

  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- regenerate_redemption_code (0054): los códigos de premios online se renuevan por 7 días ----------
create or replace function regenerate_redemption_code(p_redemption_id uuid) returns redemptions as $f$
declare
  v_row redemptions;
begin
  update redemptions r
  set code = generate_redemption_code(),
      code_expires_at = now() + case
        when exists (select 1 from benefits b where b.id = r.benefit_id and b.online)
          then (online_code_ttl_days() || ' days')::interval
        else (redemption_code_ttl_minutes() || ' minutes')::interval
      end
  where r.id = p_redemption_id and r.user_id = auth.uid() and r.status = 'pending'
    and (r.points_charged or r.code_expires_at > now() - interval '1 hour')
  returning * into v_row;

  if not found then
    raise exception 'No se puede regenerar este código. Canjeá de nuevo.';
  end if;
  return v_row;
end;
$f$ language plpgsql security definer set search_path = public;

-- ---------- Cupos ya usados de los premios online ----------
create or replace function benefits_online_redeemed()
returns table (benefit_id uuid, redeemed integer) as $f$
  select b.id,
         coalesce((select count(*)::int from redemptions r
                   where r.benefit_id = b.id and r.status in ('pending', 'confirmed')), 0)
  from benefits b
  where b.active and b.online;
$f$ language sql stable security definer set search_path = public;
revoke execute on function benefits_online_redeemed() from public, anon;
grant execute on function benefits_online_redeemed() to authenticated;
