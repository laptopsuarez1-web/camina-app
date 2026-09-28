-- Sitio web del comercio (instagram y teléfono ya existían en el schema
-- desde 0001_init.sql, pero el panel nunca los mostraba en el formulario).
alter table businesses add column website text;

-- "Solo para consumir en el local" — condición fija que el comercio puede
-- marcar al cargar su beneficio, además del horario/días de vigencia que ya
-- existían (valid_from/valid_to/valid_days_mask) pero el panel tampoco
-- exponía.
alter table benefits add column dine_in_only boolean not null default false;

-- Cuántos cupones de un beneficio ya se usaron hoy — para mostrar el stock
-- restante en la app sin exponerle a cada usuario el historial de canjes
-- ajeno (redemptions es "select own or business owner" nomás).
create or replace function benefits_remaining_today()
returns table (benefit_id uuid, redeemed_today integer) as $$
  select b.id,
         coalesce((
           select count(*)::int from redemptions r
           where r.benefit_id = b.id
             and r.status in ('pending', 'confirmed')
             and (r.created_at at time zone 'America/La_Paz')::date = local_today()
         ), 0)
  from benefits b
  where b.active;
$$ language sql stable security definer set search_path = public;

grant execute on function benefits_remaining_today() to authenticated;
