-- PROPUESTA 0042 — Antitrampa de pasos con una curva ABSOLUTA desde la medianoche (repetir llamadas ya no suma margen)
--
-- Hallazgo: SEC-03 (alto), partes B (y deja C/D como decisión del dueño, ver README sección "Decisiones").
-- ESTA MIGRACIÓN REQUIERE UNA DECISIÓN DE PRODUCTO: la "tasa" (pasos por minuto permitidos). Acá queda en 300, que es la que ya usa la 0038,
--   para no cambiar nada que el dueño no haya elegido. Con 300/min el cambio corta el abuso trivial de "10 llamadas seguidas" pero NO el de
--   fondo (20.000 pasos = 20 Puntos se alcanzan a la 1:06 de la mañana, hora de La Paz). Para que estorbe de verdad hace falta una tasa mucho
--   menor (por ejemplo 40-60 pasos/min desde medianoche, que pone los 20.000 pasos entre las 6:00 y las 8:00), validada contra datos reales para no rechazar
--   a quien camina temprano o sincroniza tarde. Cambiar la tasa es editar UN número: steps_max_per_minute().
-- Qué arregla: en la 0038/0039, v_allowed = pasos_previos + 2.000 + 300 * minutos_desde(updated_at), y updated_at se pisa en cada llamada, así que cada
--   llamada suma otros +2.000 sin esperar: ~10 llamadas seguidas llegan a 20.000 pasos / 20 Puntos sin caminar. Y la primera sincronización del día
--   cuenta desde la medianoche, así que a la 1:00 ya permite 20.000.
-- Qué hace: el máximo permitido pasa a depender SOLO de la hora: 2.000 + tasa * minutos desde la medianoche de La Paz del día sincronizado (con tope
--   100.000; si el día sincronizado es ayer, los minutos se cortan a las 24 h). No usa los pasos previos ni updated_at. Repetir llamadas no suma nada.
--   Crea dos ayudantes internos: steps_max_per_minute() y steps_allowed_at(día, momento). El resto de earn_points_from_steps queda igual a la 0039
--   (ventana hoy/ayer, tope de 20 Puntos por día, meta del día, upsert, referidos). El recorte sigue siendo silencioso.
-- Impacto en el cliente: ninguno (misma firma, mismo retorno, mismos errores). Una persona legítima no se ve afectada: lo permitido a cualquier hora del
--   día es mucho más de lo que se puede caminar. Quien sincroniza tarde también está cubierto (la curva es acumulada, no por intervalo).
--   Las pruebas viejas de 10_earn_points.sql que asumen el margen incremental de la 0038 dejan de aplicar (ver obsoletas.txt).
-- NO resuelve (decisión de producto, ver README): atestación del dispositivo (Play Integrity / App Attest), tabla de anomalías steps_anomalies, validación
--   de pasos por hora. Tampoco la sensibilidad del filtro de pasos manuales, que vive solo en el cliente.
-- Idempotente: sí.
-- Cómo se revierte: volver a aplicar earn_points_from_steps de supabase/migrations/0039_goal_history_user_count.sql
--   (y opcional: drop function public.steps_allowed_at(date, timestamptz); drop function public.steps_max_per_minute();)

-- Pasos por minuto que se admiten desde la medianoche. DECISIÓN DEL DUEÑO (hoy: 300, igual que la 0038).
create or replace function public.steps_max_per_minute() returns integer
language sql immutable set search_path = public
as $$ select 300 $$;

-- Máximo de pasos creíble para el día p_day (hora de La Paz) mirado en el momento p_at.
create or replace function public.steps_allowed_at(p_day date, p_at timestamptz) returns integer
language sql stable set search_path = public
as $$
  select least(
    100000::bigint,
    2000::bigint + floor(
      greatest(
        extract(epoch from (least(p_at, ((p_day + 1)::timestamp at time zone 'America/La_Paz')) - (p_day::timestamp at time zone 'America/La_Paz'))) / 60.0,
        0
      ) * steps_max_per_minute()
    )::bigint
  )::integer
$$;

-- Ayudantes internos: nadie con cuenta los llama (los usa earn_points_from_steps, que es security definer).
revoke execute on function public.steps_max_per_minute() from public, anon, authenticated;
revoke execute on function public.steps_allowed_at(date, timestamptz) from public, anon, authenticated;
grant execute on function public.steps_max_per_minute() to service_role;
grant execute on function public.steps_allowed_at(date, timestamptz) to service_role;

create or replace function earn_points_from_steps(p_user_id uuid, p_day date, p_steps integer)
returns integer as $$
declare
  v_target_points integer;
  v_already_earned integer;
  v_delta integer;
  v_cap integer := daily_points_cap();
  v_today date := local_today();
  v_allowed integer;
  v_steps integer;
  v_goal integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if p_day > v_today or p_day < v_today - 1 then
    raise exception 'Fecha de sincronización inválida';
  end if;

  -- Curva absoluta: lo permitido depende solo de la hora del día sincronizado, no de la llamada anterior.
  v_allowed := steps_allowed_at(p_day, now());
  v_steps := greatest(0, least(p_steps, v_allowed, 100000));

  select daily_goal into v_goal from profiles where id = p_user_id;

  insert into steps_daily (user_id, day, steps, updated_at, goal)
  values (p_user_id, p_day, v_steps, now(), v_goal)
  on conflict (user_id, day) do update
    set steps = excluded.steps,
        updated_at = now(),
        goal = case when steps_daily.day = v_today then excluded.goal else coalesce(steps_daily.goal, excluded.goal) end;

  perform 1 from steps_daily where user_id = p_user_id and day = p_day for update;

  v_target_points := least(floor(v_steps / 1000.0)::integer, v_cap);

  select coalesce(sum(amount), 0) into v_already_earned
  from points_ledger
  where user_id = p_user_id and reason = 'steps' and ref_day = p_day;

  v_delta := v_target_points - v_already_earned;
  if v_delta > 0 then
    insert into points_ledger (user_id, amount, reason, ref_day, expires_at)
    values (p_user_id, v_delta, 'steps', p_day, now() + (points_ttl_days() || ' days')::interval);
  end if;

  return user_points_balance(p_user_id);
end;
$$ language plpgsql security definer set search_path = public;
