-- Pedido real: (1) cualquiera podía dar de alta un comercio y aparecer en la
-- app al toque, sin revisión — se agrega un estado de aprobación manual.
-- (2) un comercio no debe poder bajar de plan a mitad de su período pagado
-- (es mensual) — se trackea cuándo arrancó el período actual y los cambios
-- de plan pasan por una función que respeta esa regla. (3) datos para
-- emprendimientos virtuales (sin local físico), video promocional y
-- elegibilidad de espacios publicitarios (Paso Adelante).

alter table businesses add column approved boolean not null default false;
alter table businesses add column is_virtual boolean not null default false;
alter table businesses add column promo_video_url text;
alter table businesses add column ad_eligible boolean not null default false;
alter table businesses add column plan_started_at timestamptz not null default now();
alter table businesses add column pending_plan business_plan;

-- Los comercios que ya existían (Bloom, cuentas de prueba de este sesión) se
-- consideran aprobados para no romper lo que ya está andando. De acá en
-- adelante, todo alta nueva nace con approved = false.
update businesses set approved = true;

-- ---------- RLS: solo comercios aprobados son visibles públicamente ----------
drop policy if exists "businesses: public read" on businesses;
create policy "businesses: public read approved" on businesses for select
  using (approved or auth.uid() = owner_user_id or is_admin());

drop policy if exists "benefits: public read active" on benefits;
create policy "benefits: public read active" on benefits for select
  using (
    (active and exists (select 1 from businesses b where b.id = business_id and b.approved))
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
    or is_admin()
  );

-- ---------- Campos que solo puede tocar un admin ----------
-- approved / ad_eligible / plan_started_at / pending_plan no son cosas que un
-- comercio se pueda dar a sí mismo con un UPDATE directo (la policy "owner
-- manages" es amplia). Este trigger los bloquea salvo que sea admin, y en el
-- alta los fuerza a sus valores por defecto pase lo que pase en el insert.
create or replace function enforce_business_privileged_fields() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if not is_admin() then
      new.approved := false;
      new.ad_eligible := false;
      new.plan_started_at := now();
      new.pending_plan := null;
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
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists businesses_enforce_privileged_fields on businesses;
create trigger businesses_enforce_privileged_fields
  before insert or update on businesses
  for each row execute function enforce_business_privileged_fields();

-- ---------- Cambio de plan con regla de período mensual ----------
-- Rango de planes: sirve para saber si un cambio es upgrade (se aplica ya) o
-- downgrade (espera a que termine el período pagado actual).
create or replace function plan_rank(p business_plan) returns int as $$
  select case p
    when 'primer_paso' then 0
    when 'paso_firme' then 1
    when 'paso_adelante' then 2
  end;
$$ language sql immutable;

create or replace function request_plan_change(p_business_id uuid, p_new_plan business_plan)
returns businesses as $$
declare
  b businesses;
begin
  if not is_admin() then
    raise exception 'Solo un administrador de Camina puede cambiar el plan de un comercio.';
  end if;

  select * into b from businesses where id = p_business_id for update;
  if b.id is null then
    raise exception 'Comercio no encontrado.';
  end if;

  if plan_rank(p_new_plan) >= plan_rank(b.plan) or now() >= b.plan_started_at + interval '1 month' then
    update businesses
      set plan = p_new_plan, plan_started_at = now(), pending_plan = null
      where id = p_business_id
      returning * into b;
  else
    -- downgrade pedido antes de que termine el mes pagado: queda agendado.
    update businesses
      set pending_plan = p_new_plan
      where id = p_business_id
      returning * into b;
  end if;

  return b;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function request_plan_change(uuid, business_plan) to authenticated;

-- Aplica downgrades agendados una vez que el período mensual ya terminó.
create or replace function apply_pending_plan_downgrades() returns void as $$
begin
  update businesses
    set plan = pending_plan, plan_started_at = now(), pending_plan = null
    where pending_plan is not null and now() >= plan_started_at + interval '1 month';
end;
$$ language plpgsql security definer set search_path = public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('apply-pending-plan-downgrades', '0 3 * * *', 'select apply_pending_plan_downgrades()');
  end if;
end $$;
