-- 0125: Pago único al partner. El monto se fija cuando el local se activa y ya no cambia si después cambia el plan
-- (Marcos, 2026-11-16: sin renovaciones, porcentajes ni diferencias). Idempotente.
create or replace function public.partner_leads_before()
returns trigger
language plpgsql
as $$
begin
  new.phone_key := public.partner_phone_key(new.owner_phone);
  if new.status in ('publicado', 'activo') and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'activo' and new.activated_at is null then
    new.activated_at := now();
  end if;
  if new.status <> 'activo' then
    new.activated_at := null;
  end if;
  -- Pago único: el monto se fija cuando el local se activa y no cambia aunque después cambie el plan.
  if new.status = 'activo' then
    if tg_op = 'UPDATE' and old.status = 'activo' and coalesce(old.amount_bs, 0) > 0 then
      new.amount_bs := old.amount_bs;
    else
      new.amount_bs := public.partner_amount(new.plan_kind);
    end if;
  else
    new.amount_bs := 0;
  end if;
  return new;
end;
$$;
