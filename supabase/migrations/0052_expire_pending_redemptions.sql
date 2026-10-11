-- PROPUESTA 0052 — Barrido de canjes pendientes con el código vencido (devuelve los Puntos)
--
-- Hallazgo: R01 (crítico).
-- Qué arregla: un canje cuyo código venció (15 minutos) queda 'pending' para siempre si la persona cierra la hoja del código
--   o mata la app antes de tocar "Cancelar y recuperar Puntos". Mientras tanto: los Puntos siguen retenidos, el comercio
--   queda bloqueado 14 días para esa persona y el cupo del día del beneficio sigue ocupado. Hoy nada lo limpia (no hay cron).
--   En producción hay 2 canjes así, vencidos hace más de 3 días (18 Puntos cada uno, usuario 25d20b42).
-- Qué hace: crea expire_pending_redemptions(p_grace) que cancela los canjes 'pending' cuyo código venció hace más de
--   p_grace (por defecto 1 hora) y escribe en points_ledger el mismo asiento de devolución que
--   cancel_expired_redemption (positivo, motivo 'redemption', misma nota). Es idempotente: un canje ya cancelado no se
--   devuelve dos veces. Usa FOR UPDATE SKIP LOCKED, así que no pisa a una persona que justo está cancelando o regenerando.
--   La gracia de 1 hora existe para que la persona todavía pueda "Generar un código nuevo" desde la app un rato después de
--   que venció (regenerate_redemption_code exige que siga 'pending').
-- Quién la ejecuta: nadie con cuenta (se revoca a public/anon/authenticated). La corre el reloj de la base (pg_cron, ver abajo)
--   o el dueño a mano desde el SQL Editor. Solo service_role/postgres.
-- Impacto en el cliente: ninguno obligatorio. La app seguirá pudiendo cancelar/regenerar mientras el canje esté pendiente.
--   Opcional (cliente, no se hace acá): mostrar en Canjes un aviso "Tenés un canje pendiente" que reabra la hoja.
-- No toca datos al aplicarse: solo crea la función. La limpieza de los 2 canjes existentes se hace llamándola (ver README).
-- Decisión pendiente relacionada (SEC-15): hoy la devolución nace sin vencimiento (expires_at null), igual que en
--   cancel_expired_redemption; esta función copia ese comportamiento a propósito. Si el dueño decide darle vencimiento
--   a la devolución, hay que cambiar las DOS funciones.
-- Idempotente: sí (create or replace + revoke/grant).
-- Cómo se revierte: drop function if exists public.expire_pending_redemptions(interval);
--   (y, si se programó: select cron.unschedule('expire-pending-redemptions');)

create or replace function public.expire_pending_redemptions(p_grace interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r redemptions;
  v_bname text;
  v_done integer := 0;
begin
  for r in
    select * from redemptions
    where status = 'pending'
      and code_expires_at < now() - greatest(coalesce(p_grace, interval '1 hour'), interval '0')
    order by code_expires_at
    limit 1000
    for update skip locked
  loop
    update redemptions set status = 'cancelled' where id = r.id and status = 'pending';
    if found then
      select name into v_bname from businesses where id = r.business_id;
      insert into points_ledger (user_id, amount, reason, note)
      values (r.user_id, r.cost_points, 'redemption',
              'Te devolvimos los puntos: venció el código de ' || coalesce(v_bname, 'tu canje'));
      v_done := v_done + 1;
    end if;
  end loop;
  return v_done;
end;
$$;

-- Tarea interna: nadie con cuenta (ni sin cuenta) puede llamarla; solo el dueño de la base y service_role.
revoke execute on function public.expire_pending_redemptions(interval) from public, anon, authenticated;
grant execute on function public.expire_pending_redemptions(interval) to service_role;

-- Programación (pg_cron puede no estar habilitado: por eso va COMENTADA; el dueño la corre a mano si quiere el barrido automático).
-- select cron.schedule('expire-pending-redemptions', '*/10 * * * *', 'select public.expire_pending_redemptions()');
