-- Plan gratis (Primer Paso): el primer premio tiene que ser Gratis de verdad (sin compra). Recién con ese activo se
-- habilita UN premio más, de cualquier otro tipo: regalo con compra, descuento, 2x1 o Combo Camina. Máximo 2 activos.
-- Antes "Regalo con compra" contaba como gratis y podía ser el primero. Se quita también el voseo del mensaje.
-- Cómo se revierte: volver a aplicar enforce_benefit_plan_rules() de 0058.

create or replace function public.enforce_benefit_plan_rules() returns trigger as $$
declare
  plan business_plan;
  v_puro integer;   -- premios gratis sin compra
  v_otros integer;  -- regalo con compra, descuento, 2x1 o combo
  v_es_puro boolean := new.type = 'gratis' and new.with_purchase is null;
begin
  select b.plan into plan from businesses b where b.id = new.business_id;

  if plan = 'primer_paso' then
    if new.daily_quota is null or new.daily_quota < 3 then
      raise exception 'El plan Primer Paso requiere un mínimo de 3 cupones por día';
    end if;
    if new.active then
      select count(*) filter (where type = 'gratis' and with_purchase is null),
             count(*) filter (where not (type = 'gratis' and with_purchase is null))
        into v_puro, v_otros
      from benefits
      where business_id = new.business_id and active and id <> coalesce(new.id, gen_random_uuid());
      if v_es_puro then
        if v_puro >= 1 then
          raise exception 'El plan Primer Paso permite un solo premio gratis';
        end if;
      else
        if v_puro < 1 then
          raise exception 'Primero crea un premio gratis (sin compra): después se habilita el segundo premio';
        end if;
        if v_otros >= 1 then
          raise exception 'El plan Primer Paso permite un premio gratis y uno más';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;
