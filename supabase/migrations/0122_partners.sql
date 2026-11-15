-- 0122: Programa de partners (embajadores). Gente que visita locales y cobra una comisión por cada local activo.
--
-- Montos (decididos con Marcos, 2026-11-15), una sola vez por local activo (publicado + premio + primer canje real):
--   plan gratis Bs 20 · cupo fundador Bs 25 · paga el plan de Bs 100 Bs 40 · paga el plan de Bs 300 Bs 120.
-- Bonos por cantidad de locales activos: +Bs 50 al llegar a 5 y +Bs 100 más al llegar a 10.
-- Si el local mejora de plan, el monto sube y la diferencia queda como pendiente de pago.
--
-- Todo se escribe con funciones o desde el administrador. Un partner solo ve lo suyo.

create sequence if not exists public.partner_code_seq start 1;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  code text not null unique,
  full_name text not null,
  phone text not null,
  city text not null default 'Tarija',
  zone text,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  business_name text not null,
  owner_name text,
  owner_phone text not null,
  phone_key text not null,
  zone text,
  note text,
  plan_kind text not null default 'gratis' check (plan_kind in ('gratis', 'fundador', 'plan_100', 'plan_300')),
  status text not null default 'reportado' check (status in ('reportado', 'publicado', 'activo', 'rechazado')),
  business_id uuid references public.businesses (id) on delete set null,
  amount_bs integer not null default 0,
  admin_note text,
  reported_at timestamptz not null default now(),
  published_at timestamptz,
  activated_at timestamptz
);
-- Un local, un partner: gana quien lo reportó primero (el teléfono del dueño es la llave).
create unique index if not exists partner_leads_phone_key_uq on public.partner_leads (phone_key) where status <> 'rechazado';
create index if not exists partner_leads_partner_idx on public.partner_leads (partner_id, reported_at desc);

create table if not exists public.partner_payments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount_bs integer not null check (amount_bs > 0),
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists partner_payments_partner_idx on public.partner_payments (partner_id, paid_at desc);

alter table public.partners enable row level security;
alter table public.partner_leads enable row level security;
alter table public.partner_payments enable row level security;

create policy "partners: ve el suyo" on public.partners for select using (user_id = auth.uid());
create policy "partners: admin todo" on public.partners for all using (is_admin()) with check (is_admin());

create policy "partner_leads: ve los suyos" on public.partner_leads for select
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
create policy "partner_leads: admin todo" on public.partner_leads for all using (is_admin()) with check (is_admin());

create policy "partner_payments: ve los suyos" on public.partner_payments for select
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
create policy "partner_payments: admin todo" on public.partner_payments for all using (is_admin()) with check (is_admin());

-- Teléfono sin símbolos y sin el 591: así 7 123 4567 y +591 71234567 son el mismo local.
create or replace function public.partner_phone_key(p text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) > 8 and regexp_replace(coalesce(p, ''), '\D', '', 'g') like '591%'
      then substr(regexp_replace(p, '\D', '', 'g'), 4)
    else regexp_replace(coalesce(p, ''), '\D', '', 'g')
  end;
$$;

create or replace function public.partner_amount(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan when 'gratis' then 20 when 'fundador' then 25 when 'plan_100' then 40 when 'plan_300' then 120 else 0 end;
$$;

-- Mantiene la llave del teléfono, las fechas y el monto que le toca al partner según el estado y el plan.
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
  new.amount_bs := case when new.status = 'activo' then public.partner_amount(new.plan_kind) else 0 end;
  return new;
end;
$$;
drop trigger if exists partner_leads_before_trg on public.partner_leads;
create trigger partner_leads_before_trg before insert or update on public.partner_leads
  for each row execute function public.partner_leads_before();

-- Totales de un partner: usados por su panel y por el administrador.
create or replace function public.partner_totals(p_partner uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with l as (
    select
      count(*) filter (where status = 'activo') as activos,
      count(*) filter (where status = 'publicado') as publicados,
      count(*) filter (where status = 'reportado') as reportados,
      coalesce(sum(amount_bs), 0) as locales
    from public.partner_leads where partner_id = p_partner
  ), pay as (
    select coalesce(sum(amount_bs), 0) as pagado from public.partner_payments where partner_id = p_partner
  )
  select jsonb_build_object(
    'activos', l.activos,
    'publicados', l.publicados,
    'reportados', l.reportados,
    'ganado_locales', l.locales,
    'bono', case when l.activos >= 10 then 150 when l.activos >= 5 then 50 else 0 end,
    'ganado', l.locales + case when l.activos >= 10 then 150 when l.activos >= 5 then 50 else 0 end,
    'pagado', pay.pagado,
    'pendiente', l.locales + case when l.activos >= 10 then 150 when l.activos >= 5 then 50 else 0 end - pay.pagado,
    'siguiente_bono', case when l.activos < 5 then 5 when l.activos < 10 then 10 else null end
  )
  from l, pay;
$$;
revoke all on function public.partner_totals(uuid) from public, anon, authenticated;

-- Totales del partner que está con la sesión abierta.
create or replace function public.partner_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v_id uuid;
begin
  select id into v_id from public.partners where user_id = auth.uid();
  if v_id is null then return null; end if;
  return public.partner_totals(v_id);
end;
$$;
revoke all on function public.partner_summary() from public, anon;
grant execute on function public.partner_summary() to authenticated;

-- Alta de partner (la persona ya tiene su cuenta de correo y clave).
create or replace function public.register_partner(p_name text, p_phone text, p_zone text)
returns public.partners
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.partners;
begin
  if v_uid is null then raise exception 'Tu sesión se cerró. Vuelve a iniciar sesión.'; end if;
  select * into v_row from public.partners where user_id = v_uid;
  if found then return v_row; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Escribe tu nombre.'; end if;
  if length(public.partner_phone_key(p_phone)) < 7 then raise exception 'Escribe tu número de WhatsApp.'; end if;
  insert into public.partners (user_id, code, full_name, phone, zone)
  values (v_uid, 'EMB-' || lpad(nextval('public.partner_code_seq')::text, 3, '0'), trim(p_name), trim(p_phone), nullif(trim(coalesce(p_zone, '')), ''))
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.register_partner(text, text, text) from public, anon;
grant execute on function public.register_partner(text, text, text) to authenticated;

-- Reportar un local. Si el teléfono del dueño ya está (de otro partner, tuyo o ya en Camina), avisa en vez de duplicar.
create or replace function public.partner_report_lead(
  p_business text, p_owner text, p_phone text, p_zone text, p_plan text, p_note text
)
returns public.partner_leads
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_partner public.partners;
  v_key text := public.partner_phone_key(p_phone);
  v_other public.partner_leads;
  v_row public.partner_leads;
begin
  select * into v_partner from public.partners where user_id = auth.uid();
  if not found then raise exception 'Primero crea tu cuenta de partner.'; end if;
  if v_partner.status <> 'active' then raise exception 'Tu cuenta de partner está en pausa. Escríbenos por WhatsApp.'; end if;
  if length(trim(coalesce(p_business, ''))) < 2 then raise exception 'Escribe el nombre del local.'; end if;
  if length(v_key) < 7 then raise exception 'Escribe el WhatsApp del dueño del local.'; end if;
  if p_plan not in ('gratis', 'fundador', 'plan_100', 'plan_300') then p_plan := 'gratis'; end if;

  select * into v_other from public.partner_leads where phone_key = v_key and status <> 'rechazado' limit 1;
  if found then
    if v_other.partner_id = v_partner.id then
      raise exception 'Ya reportaste este local.';
    end if;
    raise exception 'Ese local ya lo reportó otro partner antes. Gana quien lo reportó primero.';
  end if;
  if exists (select 1 from public.businesses b where public.partner_phone_key(b.phone) = v_key) then
    raise exception 'Ese local ya está en Camina, no se puede reportar.';
  end if;

  insert into public.partner_leads (partner_id, business_name, owner_name, owner_phone, phone_key, zone, note, plan_kind)
  values (v_partner.id, trim(p_business), nullif(trim(coalesce(p_owner, '')), ''), trim(p_phone), v_key,
          nullif(trim(coalesce(p_zone, '')), ''), nullif(trim(coalesce(p_note, '')), ''), p_plan)
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.partner_report_lead(text, text, text, text, text, text) from public, anon;
grant execute on function public.partner_report_lead(text, text, text, text, text, text) to authenticated;

-- Para el administrador: todos los partners con sus totales.
create or replace function public.admin_partner_overview()
returns table (
  id uuid, code text, full_name text, phone text, zone text, status text, created_at timestamptz, email text, totals jsonb
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then raise exception 'No tienes permiso.'; end if;
  return query
    select p.id, p.code, p.full_name, p.phone, p.zone, p.status, p.created_at, u.email::text, public.partner_totals(p.id)
    from public.partners p
    left join auth.users u on u.id = p.user_id
    order by p.created_at desc;
end;
$$;
revoke all on function public.admin_partner_overview() from public, anon;
grant execute on function public.admin_partner_overview() to authenticated;
