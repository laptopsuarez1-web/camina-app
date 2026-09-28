-- Panel de administrador para el equipo de Camina (no dueños de comercio):
-- ver todos los negocios y activar planes pagos directo, sin pasar por SQL
-- a mano cada vez. app_admins queda totalmente cerrada al cliente (RLS sin
-- policies) — solo se toca desde el SQL Editor o por acá.
create table app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table app_admins enable row level security;
-- Sin policies a propósito: ni siquiera un admin puede leer/escribir esta
-- tabla desde el cliente. Se administra a mano (SQL Editor / acá).

create or replace function is_admin() returns boolean as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

grant execute on function is_admin() to authenticated;

-- Los admins ven y editan cualquier negocio (además de la policy existente
-- "businesses: owner manages", que sigue aplicando para los dueños).
create policy "businesses: admin full access" on businesses for all
  using (is_admin())
  with check (is_admin());

create policy "benefits: admin read" on benefits for select
  using (is_admin());

create policy "redemptions: admin read" on redemptions for select
  using (is_admin());

-- El trigger que bloquea el auto-upgrade de plan deja pasar a los admins —
-- para eso existe el panel: activar el plan después de confirmar el pago.
create or replace function prevent_self_plan_change() returns trigger as $$
begin
  if new.plan is distinct from old.plan and auth.role() = 'authenticated' and not is_admin() then
    raise exception 'El cambio de plan requiere confirmar el pago con Camina — todavía no está disponible de forma automática.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
