-- PROPUESTA 0043 — Un comercio nuevo no puede nacer con plan pago ni como "fundador"; el tipo de cuenta no cambia después del alta
--
-- Hallazgo: SEC-04 (alto en la auditoría, medio según el verificador).
-- Qué arregla: el trigger enforce_business_privileged_fields (0014), en el INSERT, solo reseteaba approved, ad_eligible,
--   plan_started_at y pending_plan. Los triggers que protegen 'plan' (prevent_self_plan_change) y 'founder'/'founder_until'
--   (protect_founder_fields) son BEFORE UPDATE, así que un cliente modificado que crea su comercio con plan='paso_adelante',
--   founder=true y founder_until=... saltea el paywall y puede ocupar los 20 cupos del programa fundador (grant_founder cuenta
--   filas con founder=true). Además account_kind ('commerce' / 'events_only') se podía cambiar después del alta, y eso cambia el
--   precio de un sorteo (0025).
-- Qué hace: reemplaza la función del trigger (el trigger no se toca):
--   * INSERT (cualquiera que no sea admin): igual que hoy, y además, SOLO si la petición viene de una persona con sesión
--     (auth.role() = 'authenticated'): plan := 'primer_paso', founder := false, founder_until := null.
--     account_kind se deja como lo manda el cliente en el alta ('events_only' es legítimo en el registro).
--   * UPDATE (persona con sesión que no es admin): igual que hoy, y además account_kind := old.account_kind (se revierte en silencio,
--     sin error, como ya hace protect_founder_fields).
--   Los seeds por SQL Editor / service_role (auth.role() nulo) y el panel de admin (is_admin()) no cambian.
-- Impacto en el cliente: ninguno. El registro del panel (apps/partner registro/page.tsx y useBusinessAuth.ts) manda plan:'primer_paso'
--   y account_kind:'commerce'|'events_only' en el INSERT; el panel nunca actualiza account_kind (grep en apps/partner y apps/mobile).
--   El admin sigue cambiando planes con request_plan_change y fundadores con grant_founder (security definer, is_admin()).
-- Idempotente: sí (create or replace).
-- Cómo se revierte: volver a crear la función con el cuerpo de la 0014 (supabase/migrations/0014_business_approval_and_plan_rules.sql, líneas 39-65).

create or replace function enforce_business_privileged_fields() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if not is_admin() then
      new.approved := false;
      new.ad_eligible := false;
      new.plan_started_at := now();
      new.pending_plan := null;
      -- Una persona con sesión no puede darse un plan pago ni el programa fundador al crear su comercio.
      if auth.role() = 'authenticated' then
        new.plan := 'primer_paso';
        new.founder := false;
        new.founder_until := null;
      end if;
    end if;
    return new;
  end if;

  if auth.role() = 'authenticated' and not is_admin() then
    if new.approved is distinct from old.approved then
      raise exception 'La aprobación del comercio la confirma el equipo de Camina.';
    end if;
    if new.ad_eligible is distinct from old.ad_eligible then
      raise exception 'La elegibilidad para espacios publicitarios la define el equipo de Camina.';
    end if;
    new.plan_started_at := old.plan_started_at;
    new.pending_plan := old.pending_plan;
    new.account_kind := old.account_kind;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
