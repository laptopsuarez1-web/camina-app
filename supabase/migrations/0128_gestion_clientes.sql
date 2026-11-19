-- 0128 — Gestión de clientes, asistencia, sesiones y caja (módulo genérico para cualquier negocio con clientes recurrentes).
--
-- Cada negocio (tabla businesses) es su propio espacio: todas las tablas llevan business_id y la RLS solo deja leer
-- a quien tiene permiso EN ESE negocio. Las escrituras van SOLO por funciones security definer que:
--   1) comprueban el permiso en el servidor (gestion_can),
--   2) validan importes, pertenencia de cliente/servicio/paquete al negocio y fechas,
--   3) guardan quién lo hizo (created_by + correo) y dejan una fila en gestion_audit.
-- Nada se borra: asistencias y pagos se ANULAN (voided_at + motivo) y quedan en el historial.
--
-- Dinero (siempre por cliente):
--   cargos  = valor de las asistencias (charge) + precio de paquetes vendidos + ajustes de tipo 'cargo'
--   abonos  = pagos + ajustes de tipo 'descuento'
--   saldo   = cargos − abonos   (> 0 debe, < 0 tiene saldo a favor por pago anticipado)
-- Una asistencia NO es un pago: el valor del servicio se carga y el cobro se registra aparte (puede ser parcial, cero o anticipado).
-- Una asistencia con paquete descuenta una sesión del paquete y no genera cargo (el paquete ya se cargó al venderlo).
--
-- Dueño del negocio = Administrador con todos los permisos. Los empleados son las filas de business_staff (las mismas
-- invitaciones por correo que ya usan los cajeros de canjes) con un rol de gestión (gestion_role_id). Sin rol = sin acceso
-- a gestión (sigue pudiendo confirmar canjes de Camina como hasta ahora).
--
-- Datos clínicos (si el negocio es sanitario y lo activa): tabla aparte, sin lectura directa, solo por función con
-- permiso propio (clinical.view / clinical.edit) y cada lectura queda en la auditoría.

-- ============================================================ Catálogo de permisos

create or replace function gestion_all_permissions() returns text[] language sql immutable as $$
  select array[
    'dashboard.view',   -- panel principal con ingresos y estadísticas
    'clients.view',     -- ver datos básicos de clientes
    'clients.edit',     -- crear y editar clientes
    'clients.history',  -- ver el historial completo de cada cliente
    'clinical.view',    -- leer notas clínicas
    'clinical.edit',    -- escribir notas clínicas
    'visits.create',    -- registrar asistencias
    'visits.void',      -- anular asistencias
    'payments.create',  -- registrar cobros
    'payments.view',    -- consultar pagos
    'payments.void',    -- anular pagos
    'receipts.issue',   -- emitir comprobantes
    'finance.view',     -- resumen financiero, deudas y saldos
    'finance.adjust',   -- descuentos y ajustes autorizados
    'packages.sell',    -- vender paquetes de sesiones
    'agenda.view',      -- ver agenda
    'agenda.edit',      -- agendar, mover y cancelar citas
    'reports.view',     -- reportes
    'reports.export',   -- exportar PDF / Excel y copia de seguridad
    'settings.manage',  -- configuración, servicios y precios
    'staff.manage',     -- empleados, roles y permisos
    'audit.view'        -- registro de auditoría
  ]::text[]
$$;

-- ============================================================ Tablas

create table if not exists gestion_settings (
  business_id uuid primary key references businesses (id) on delete cascade,
  display_name text,                                   -- nombre que sale en comprobantes (si es null, el del negocio)
  activity_type text not null default 'Servicios',
  client_singular text not null default 'Cliente',
  client_plural text not null default 'Clientes',
  session_singular text not null default 'Sesión',
  session_plural text not null default 'Sesiones',
  currency text not null default 'Bs',
  timezone text not null default 'America/La_Paz',
  payment_methods text[] not null default array['Efectivo', 'QR', 'Transferencia', 'Tarjeta'],
  custom_fields jsonb not null default '[]'::jsonb,   -- [{key,label,type:'text'|'number'|'date'|'select',options?:[]}]
  clinical_enabled boolean not null default false,
  receipt_footer text,
  next_receipt integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(currency) between 1 and 8),
  check (jsonb_typeof(custom_fields) = 'array'),
  check (cardinality(payment_methods) between 1 and 15)
);

create table if not exists gestion_roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index if not exists gestion_roles_business_idx on gestion_roles (business_id);

alter table business_staff add column if not exists gestion_role_id uuid references gestion_roles (id) on delete set null;
alter table business_staff add column if not exists display_name text;

create table if not exists gestion_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  price numeric(12,2) not null default 0 check (price >= 0 and price <= 1000000),
  duration_min integer check (duration_min is null or duration_min between 5 and 1440),
  -- 1 = sesión suelta. Más de 1 = paquete (se vende y luego cada asistencia descuenta una sesión).
  sessions_included integer not null default 1 check (sessions_included between 1 and 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists gestion_services_business_idx on gestion_services (business_id);

create table if not exists gestion_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 160),
  registered_at date not null default current_date,
  service_id uuid references gestion_services (id) on delete set null,
  status text not null default 'activo' check (status in ('activo', 'inactivo', 'suspendido')),
  notes text check (notes is null or char_length(notes) <= 2000),
  custom jsonb not null default '{}'::jsonb check (jsonb_typeof(custom) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gestion_clients_business_idx on gestion_clients (business_id, status);
create index if not exists gestion_clients_name_idx on gestion_clients (business_id, lower(first_name || ' ' || last_name));

create table if not exists gestion_packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  service_id uuid references gestion_services (id) on delete set null,
  name text not null,
  sessions_total integer not null check (sessions_total between 1 and 500),
  price numeric(12,2) not null check (price >= 0 and price <= 1000000),
  purchased_at timestamptz not null default now(),
  expires_on date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  void_reason text
);
create index if not exists gestion_packages_client_idx on gestion_packages (client_id);
create index if not exists gestion_packages_business_idx on gestion_packages (business_id, purchased_at);

create table if not exists gestion_appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  service_id uuid references gestion_services (id) on delete set null,
  starts_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min between 5 and 1440),
  status text not null default 'programada' check (status in ('programada', 'atendida', 'cancelada', 'no_asistio')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists gestion_appointments_business_idx on gestion_appointments (business_id, starts_at);
create index if not exists gestion_appointments_client_idx on gestion_appointments (client_id, starts_at);

create table if not exists gestion_visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  service_id uuid references gestion_services (id) on delete set null,
  service_name text,                                   -- copia del nombre al momento (por si el servicio cambia)
  occurred_at timestamptz not null default now(),
  status text not null default 'asistio' check (status in ('asistio', 'falto', 'cancelo')),
  -- Valor del servicio que se le carga al cliente (no es lo cobrado). 0 si usa paquete.
  charge numeric(12,2) not null default 0 check (charge >= 0 and charge <= 1000000),
  list_price numeric(12,2),                            -- precio de lista del servicio en ese momento
  package_id uuid references gestion_packages (id) on delete set null,
  appointment_id uuid references gestion_appointments (id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  void_reason text
);
create index if not exists gestion_visits_business_idx on gestion_visits (business_id, occurred_at);
create index if not exists gestion_visits_client_idx on gestion_visits (client_id, occurred_at);
create index if not exists gestion_visits_package_idx on gestion_visits (package_id) where package_id is not null;

create table if not exists gestion_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  method text not null check (char_length(method) between 1 and 40),
  paid_at timestamptz not null default now(),
  visit_id uuid references gestion_visits (id) on delete set null,
  package_id uuid references gestion_packages (id) on delete set null,
  concept text check (concept is null or char_length(concept) <= 200),
  notes text check (notes is null or char_length(notes) <= 1000),
  receipt_number integer not null,
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  void_reason text,
  unique (business_id, receipt_number)
);
create index if not exists gestion_payments_business_idx on gestion_payments (business_id, paid_at);
create index if not exists gestion_payments_client_idx on gestion_payments (client_id, paid_at);

create table if not exists gestion_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  kind text not null check (kind in ('descuento', 'cargo')),
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  reason text not null check (char_length(btrim(reason)) between 3 and 300),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  void_reason text
);
create index if not exists gestion_adjustments_client_idx on gestion_adjustments (client_id, created_at);

-- Datos clínicos: separados de los administrativos. Sin políticas de lectura: solo por función.
create table if not exists gestion_clinical_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id uuid not null references gestion_clients (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists gestion_clinical_client_idx on gestion_clinical_notes (client_id, created_at);

create table if not exists gestion_audit (
  id bigint generated always as identity primary key,
  business_id uuid not null references businesses (id) on delete cascade,
  actor uuid,
  actor_email text,
  action text not null,
  entity text,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gestion_audit_business_idx on gestion_audit (business_id, created_at desc);

-- ============================================================ Ayudantes de acceso

create or replace function gestion_is_owner(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses b where b.id = p_business and b.owner_user_id = auth.uid() and auth.uid() is not null)
$$;

create or replace function gestion_permissions(p_business uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then '{}'::text[]
    when gestion_is_owner(p_business) then gestion_all_permissions()
    else coalesce((
      select r.permissions from business_staff s
      join gestion_roles r on r.id = s.gestion_role_id and r.business_id = s.business_id
      where s.business_id = p_business and s.user_id = auth.uid()
      limit 1), '{}'::text[])
  end
$$;

create or replace function gestion_can(p_business uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_perm = any (gestion_permissions(p_business))
$$;

create or replace function gestion_is_member(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cardinality(gestion_permissions(p_business)) > 0
$$;

create or replace function gestion_require(p_business uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_business is null or not gestion_can(p_business, p_perm) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
end $$;

create or replace function gestion_actor_email() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(auth.jwt() ->> 'email', ''), (select u.email from auth.users u where u.id = auth.uid()))
$$;

create or replace function gestion_log(p_business uuid, p_action text, p_entity text, p_entity_id uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into gestion_audit (business_id, actor, actor_email, action, entity, entity_id, detail)
  values (p_business, auth.uid(), gestion_actor_email(), p_action, p_entity, p_entity_id, coalesce(p_detail, '{}'::jsonb))
$$;

-- Hoy y "ahora" en la zona horaria del negocio.
create or replace function gestion_tz(p_business uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select timezone from gestion_settings where business_id = p_business), 'America/La_Paz')
$$;

create or replace function gestion_money(v numeric) returns numeric language sql immutable as $$
  select round(coalesce(v, 0), 2)
$$;

-- Crea la configuración y los tres roles de base la primera vez que el dueño entra.
create or replace function gestion_bootstrap(p_business uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into gestion_settings (business_id, display_name, activity_type)
  select b.id, b.name, coalesce(nullif(b.category, ''), 'Servicios') from businesses b where b.id = p_business
  on conflict (business_id) do nothing;

  insert into gestion_roles (business_id, name, permissions, is_system) values
    (p_business, 'Administrador', gestion_all_permissions(), true),
    (p_business, 'Recepción', array['clients.view','clients.edit','visits.create','payments.create','receipts.issue','agenda.view','agenda.edit','packages.sell'], true),
    (p_business, 'Cajero', array['clients.view','payments.create','payments.view','receipts.issue'], true)
  on conflict (business_id, name) do nothing;
end $$;

-- Lo que la pantalla necesita para arrancar: permisos de quien entra y la configuración del negocio.
create or replace function gestion_my_access(p_business uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_owner boolean := gestion_is_owner(p_business);
  v_role gestion_roles;
  v_settings gestion_settings;
begin
  if auth.uid() is null then return jsonb_build_object('member', false); end if;
  if v_owner then perform gestion_bootstrap(p_business); end if;
  if not v_owner then
    select r.* into v_role from business_staff s join gestion_roles r on r.id = s.gestion_role_id and r.business_id = s.business_id
    where s.business_id = p_business and s.user_id = auth.uid() limit 1;
    if v_role.id is null then return jsonb_build_object('member', false); end if;
  end if;
  select * into v_settings from gestion_settings where business_id = p_business;
  return jsonb_build_object(
    'member', true,
    'owner', v_owner,
    'role_name', case when v_owner then 'Propietario' else v_role.name end,
    'permissions', to_jsonb(gestion_permissions(p_business)),
    'settings', to_jsonb(v_settings) - 'next_receipt'
  );
end $$;

-- ============================================================ RLS (solo lectura; escribir = funciones)

alter table gestion_settings enable row level security;
alter table gestion_roles enable row level security;
alter table gestion_services enable row level security;
alter table gestion_clients enable row level security;
alter table gestion_packages enable row level security;
alter table gestion_appointments enable row level security;
alter table gestion_visits enable row level security;
alter table gestion_payments enable row level security;
alter table gestion_adjustments enable row level security;
alter table gestion_clinical_notes enable row level security;
alter table gestion_audit enable row level security;

drop policy if exists "gestion_settings read" on gestion_settings;
create policy "gestion_settings read" on gestion_settings for select to authenticated using (gestion_is_member(business_id));
drop policy if exists "gestion_roles read" on gestion_roles;
create policy "gestion_roles read" on gestion_roles for select to authenticated using (gestion_is_member(business_id));
drop policy if exists "gestion_services read" on gestion_services;
create policy "gestion_services read" on gestion_services for select to authenticated using (gestion_is_member(business_id));
drop policy if exists "gestion_clients read" on gestion_clients;
create policy "gestion_clients read" on gestion_clients for select to authenticated using (gestion_can(business_id, 'clients.view'));
drop policy if exists "gestion_packages read" on gestion_packages;
create policy "gestion_packages read" on gestion_packages for select to authenticated
  using (gestion_can(business_id, 'finance.view') or gestion_can(business_id, 'clients.history')
      or gestion_can(business_id, 'visits.create') or gestion_can(business_id, 'packages.sell'));
drop policy if exists "gestion_appointments read" on gestion_appointments;
create policy "gestion_appointments read" on gestion_appointments for select to authenticated
  using (gestion_can(business_id, 'agenda.view') or gestion_can(business_id, 'clients.history'));
-- Recepción ve solo lo registrado en las últimas 36 horas; el historial completo requiere clients.history o reportes.
drop policy if exists "gestion_visits read" on gestion_visits;
create policy "gestion_visits read" on gestion_visits for select to authenticated
  using (gestion_can(business_id, 'clients.history') or gestion_can(business_id, 'reports.view')
      or (gestion_can(business_id, 'visits.create') and occurred_at > now() - interval '36 hours'));
drop policy if exists "gestion_payments read" on gestion_payments;
create policy "gestion_payments read" on gestion_payments for select to authenticated
  using (gestion_can(business_id, 'payments.view') or gestion_can(business_id, 'finance.view') or gestion_can(business_id, 'reports.view')
      or (gestion_can(business_id, 'payments.create') and paid_at > now() - interval '36 hours'));
drop policy if exists "gestion_adjustments read" on gestion_adjustments;
create policy "gestion_adjustments read" on gestion_adjustments for select to authenticated
  using (gestion_can(business_id, 'finance.view') or gestion_can(business_id, 'clients.history'));
drop policy if exists "gestion_audit read" on gestion_audit;
create policy "gestion_audit read" on gestion_audit for select to authenticated using (gestion_can(business_id, 'audit.view'));
-- gestion_clinical_notes: sin políticas a propósito.

-- Nadie escribe directo (solo las funciones). Tampoco sin sesión.
revoke all on gestion_settings, gestion_roles, gestion_services, gestion_clients, gestion_packages, gestion_appointments,
  gestion_visits, gestion_payments, gestion_adjustments, gestion_clinical_notes, gestion_audit from anon;
revoke insert, update, delete, truncate, references, trigger on gestion_settings, gestion_roles, gestion_services, gestion_clients,
  gestion_packages, gestion_appointments, gestion_visits, gestion_payments, gestion_adjustments, gestion_clinical_notes, gestion_audit
  from authenticated;
revoke select on gestion_clinical_notes from authenticated;

-- Los empleados pueden ver a sus compañeros si administran el equipo (antes solo el dueño o uno mismo).
drop policy if exists "staff: gestion managers read" on business_staff;
create policy "staff: gestion managers read" on business_staff for select to authenticated
  using (gestion_can(business_id, 'staff.manage'));

-- ============================================================ Configuración

create or replace function gestion_save_settings(p_business uuid, p jsonb) returns gestion_settings
language plpgsql security definer set search_path = public as $$
declare
  r gestion_settings;
  v_methods text[];
  v_fields jsonb;
begin
  perform gestion_require(p_business, 'settings.manage');
  perform gestion_bootstrap(p_business);
  if p ? 'payment_methods' then
    select coalesce(array_agg(distinct btrim(x)) filter (where btrim(x) <> ''), '{}') into v_methods
    from jsonb_array_elements_text(p -> 'payment_methods') x;
    if cardinality(v_methods) = 0 then raise exception 'Deja al menos un método de pago.'; end if;
  end if;
  if p ? 'custom_fields' then
    v_fields := p -> 'custom_fields';
    if jsonb_typeof(v_fields) <> 'array' or jsonb_array_length(v_fields) > 20 then
      raise exception 'Campos adicionales inválidos (máximo 20).';
    end if;
    if exists (select 1 from jsonb_array_elements(v_fields) f
               where coalesce(f ->> 'key', '') !~ '^[a-z0-9_]{1,40}$' or char_length(coalesce(f ->> 'label', '')) not between 1 and 60
                  or coalesce(f ->> 'type', '') not in ('text', 'number', 'date', 'select')) then
      raise exception 'Cada campo adicional necesita nombre y tipo válido.';
    end if;
  end if;
  if p ? 'timezone' and not exists (select 1 from pg_timezone_names where name = p ->> 'timezone') then
    raise exception 'Zona horaria desconocida.';
  end if;

  update gestion_settings s set
    display_name     = coalesce(nullif(btrim(p ->> 'display_name'), ''), s.display_name),
    activity_type    = coalesce(nullif(btrim(p ->> 'activity_type'), ''), s.activity_type),
    client_singular  = coalesce(nullif(btrim(p ->> 'client_singular'), ''), s.client_singular),
    client_plural    = coalesce(nullif(btrim(p ->> 'client_plural'), ''), s.client_plural),
    session_singular = coalesce(nullif(btrim(p ->> 'session_singular'), ''), s.session_singular),
    session_plural   = coalesce(nullif(btrim(p ->> 'session_plural'), ''), s.session_plural),
    currency         = coalesce(nullif(btrim(p ->> 'currency'), ''), s.currency),
    timezone         = coalesce(nullif(p ->> 'timezone', ''), s.timezone),
    payment_methods  = coalesce(v_methods, s.payment_methods),
    custom_fields    = coalesce(v_fields, s.custom_fields),
    clinical_enabled = coalesce((p ->> 'clinical_enabled')::boolean, s.clinical_enabled),
    receipt_footer   = case when p ? 'receipt_footer' then nullif(btrim(p ->> 'receipt_footer'), '') else s.receipt_footer end,
    updated_at = now()
  where s.business_id = p_business
  returning * into r;
  perform gestion_log(p_business, 'settings.update', 'settings', null, p);
  return r;
end $$;

create or replace function gestion_save_service(p_business uuid, p jsonb) returns gestion_services
language plpgsql security definer set search_path = public as $$
declare
  r gestion_services;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform gestion_require(p_business, 'settings.manage');
  if v_id is null then
    insert into gestion_services (business_id, name, price, duration_min, sessions_included, active)
    values (p_business, btrim(p ->> 'name'), gestion_money((p ->> 'price')::numeric), nullif(p ->> 'duration_min', '')::int,
            coalesce(nullif(p ->> 'sessions_included', '')::int, 1), coalesce((p ->> 'active')::boolean, true))
    returning * into r;
    perform gestion_log(p_business, 'service.create', 'service', r.id, to_jsonb(r));
  else
    update gestion_services set
      name = btrim(coalesce(p ->> 'name', name)),
      price = gestion_money(coalesce((p ->> 'price')::numeric, price)),
      duration_min = case when p ? 'duration_min' then nullif(p ->> 'duration_min', '')::int else duration_min end,
      sessions_included = coalesce(nullif(p ->> 'sessions_included', '')::int, sessions_included),
      active = coalesce((p ->> 'active')::boolean, active)
    where id = v_id and business_id = p_business
    returning * into r;
    if r.id is null then raise exception 'Servicio no encontrado.'; end if;
    perform gestion_log(p_business, 'service.update', 'service', r.id, to_jsonb(r));
  end if;
  return r;
end $$;

-- ============================================================ Equipo, roles y permisos

create or replace function gestion_save_role(p_business uuid, p_id uuid, p_name text, p_permissions text[]) returns gestion_roles
language plpgsql security definer set search_path = public as $$
declare
  r gestion_roles;
  v_perms text[];
begin
  perform gestion_require(p_business, 'staff.manage');
  select coalesce(array_agg(distinct x), '{}') into v_perms from unnest(coalesce(p_permissions, '{}')) x where x = any (gestion_all_permissions());
  -- Nadie puede dar permisos que no tiene (el dueño los tiene todos).
  if not (v_perms <@ gestion_permissions(p_business)) then
    raise exception 'No puedes dar permisos que tú no tienes.';
  end if;
  if p_id is null then
    insert into gestion_roles (business_id, name, permissions) values (p_business, btrim(p_name), v_perms) returning * into r;
    perform gestion_log(p_business, 'role.create', 'role', r.id, jsonb_build_object('name', r.name, 'permissions', r.permissions));
  else
    if not gestion_is_owner(p_business) and exists (
      select 1 from business_staff where business_id = p_business and user_id = auth.uid() and gestion_role_id = p_id) then
      raise exception 'No puedes cambiar tu propio rol.';
    end if;
    update gestion_roles set name = btrim(p_name), permissions = v_perms
    where id = p_id and business_id = p_business returning * into r;
    if r.id is null then raise exception 'Rol no encontrado.'; end if;
    perform gestion_log(p_business, 'role.update', 'role', r.id, jsonb_build_object('name', r.name, 'permissions', r.permissions));
  end if;
  return r;
exception when unique_violation then
  raise exception 'Ya existe un rol con ese nombre.';
end $$;

create or replace function gestion_delete_role(p_role uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_business uuid;
begin
  select business_id into v_business from gestion_roles where id = p_role;
  perform gestion_require(v_business, 'staff.manage');
  if exists (select 1 from business_staff where gestion_role_id = p_role) then
    raise exception 'Hay personas con este rol. Cámbiales el rol antes de borrarlo.';
  end if;
  delete from gestion_roles where id = p_role;
  perform gestion_log(v_business, 'role.delete', 'role', p_role, '{}');
end $$;

-- Invita por correo (la misma invitación que usan los cajeros de canjes) y le asigna un rol de gestión.
create or replace function gestion_invite_staff(p_business uuid, p_email text, p_role uuid, p_name text default null) returns business_staff
language plpgsql security definer set search_path = public as $$
declare
  r business_staff;
  v_email text := lower(btrim(p_email));
  v_perms text[];
begin
  perform gestion_require(p_business, 'staff.manage');
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Escribe un correo válido.'; end if;
  select permissions into v_perms from gestion_roles where id = p_role and business_id = p_business;
  if v_perms is null then raise exception 'Elige un rol.'; end if;
  if not (v_perms <@ gestion_permissions(p_business)) then raise exception 'No puedes dar permisos que tú no tienes.'; end if;
  if exists (select 1 from businesses b join auth.users u on u.id = b.owner_user_id where b.id = p_business and lower(u.email) = v_email) then
    raise exception 'Ese correo es el del propietario.';
  end if;
  if (select count(*) from business_staff where business_id = p_business) >= 30 then
    raise exception 'Puedes tener hasta 30 personas en el equipo.';
  end if;
  insert into business_staff (business_id, email, gestion_role_id, display_name)
  values (p_business, v_email, p_role, nullif(btrim(p_name), ''))
  on conflict (business_id, email) do update set gestion_role_id = excluded.gestion_role_id,
    display_name = coalesce(excluded.display_name, business_staff.display_name)
  returning * into r;
  perform gestion_log(p_business, 'staff.invite', 'staff', r.id, jsonb_build_object('email', v_email, 'role', p_role));
  return r;
end $$;

-- Cambia el rol (null = quitar acceso a gestión, sigue pudiendo confirmar canjes).
create or replace function gestion_set_staff_role(p_staff uuid, p_role uuid) returns business_staff
language plpgsql security definer set search_path = public as $$
declare
  s business_staff;
  v_perms text[];
begin
  select * into s from business_staff where id = p_staff;
  perform gestion_require(s.business_id, 'staff.manage');
  if s.user_id = auth.uid() then raise exception 'No puedes cambiar tu propio rol.'; end if;
  if p_role is not null then
    select permissions into v_perms from gestion_roles where id = p_role and business_id = s.business_id;
    if v_perms is null then raise exception 'Rol no encontrado.'; end if;
    if not (v_perms <@ gestion_permissions(s.business_id)) then raise exception 'No puedes dar permisos que tú no tienes.'; end if;
  end if;
  update business_staff set gestion_role_id = p_role where id = p_staff returning * into s;
  perform gestion_log(s.business_id, case when p_role is null then 'staff.revoke' else 'staff.role' end, 'staff', s.id,
    jsonb_build_object('email', s.email, 'role', p_role));
  return s;
end $$;

-- Quita a la persona del negocio por completo (acceso revocado al instante).
create or replace function gestion_remove_staff(p_staff uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  s business_staff;
begin
  select * into s from business_staff where id = p_staff;
  perform gestion_require(s.business_id, 'staff.manage');
  if s.user_id = auth.uid() then raise exception 'No puedes quitarte a ti mismo.'; end if;
  delete from business_staff where id = p_staff;
  perform gestion_log(s.business_id, 'staff.remove', 'staff', s.id, jsonb_build_object('email', s.email));
end $$;

-- ============================================================ Clientes

create or replace function gestion_save_client(p_business uuid, p jsonb) returns gestion_clients
language plpgsql security definer set search_path = public as $$
declare
  r gestion_clients;
  old gestion_clients;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_service uuid := nullif(p ->> 'service_id', '')::uuid;
  v_email text := nullif(lower(btrim(p ->> 'email')), '');
begin
  perform gestion_require(p_business, 'clients.edit');
  if v_service is not null and not exists (select 1 from gestion_services where id = v_service and business_id = p_business) then
    raise exception 'Servicio no encontrado.';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'El correo no es válido.'; end if;
  if p ? 'custom' and jsonb_typeof(p -> 'custom') <> 'object' then raise exception 'Campos adicionales inválidos.'; end if;
  if v_id is null then
    insert into gestion_clients (business_id, first_name, last_name, phone, email, registered_at, service_id, status, notes, custom,
                                 created_by, created_by_email)
    values (p_business, btrim(p ->> 'first_name'), coalesce(btrim(p ->> 'last_name'), ''), nullif(btrim(p ->> 'phone'), ''), v_email,
            coalesce(nullif(p ->> 'registered_at', '')::date, (now() at time zone gestion_tz(p_business))::date), v_service,
            coalesce(nullif(p ->> 'status', ''), 'activo'), nullif(btrim(p ->> 'notes'), ''), coalesce(p -> 'custom', '{}'),
            auth.uid(), gestion_actor_email())
    returning * into r;
    perform gestion_log(p_business, 'client.create', 'client', r.id, jsonb_build_object('name', r.first_name || ' ' || r.last_name));
  else
    select * into old from gestion_clients where id = v_id and business_id = p_business for update;
    if old.id is null then raise exception 'No se encontró.'; end if;
    update gestion_clients set
      first_name = coalesce(nullif(btrim(p ->> 'first_name'), ''), first_name),
      last_name = case when p ? 'last_name' then coalesce(btrim(p ->> 'last_name'), '') else last_name end,
      phone = case when p ? 'phone' then nullif(btrim(p ->> 'phone'), '') else phone end,
      email = case when p ? 'email' then v_email else email end,
      registered_at = coalesce(nullif(p ->> 'registered_at', '')::date, registered_at),
      service_id = case when p ? 'service_id' then v_service else service_id end,
      status = coalesce(nullif(p ->> 'status', ''), status),
      notes = case when p ? 'notes' then nullif(btrim(p ->> 'notes'), '') else notes end,
      custom = coalesce(p -> 'custom', custom),
      updated_at = now()
    where id = v_id
    returning * into r;
    perform gestion_log(p_business, case when old.status is distinct from r.status then 'client.status' else 'client.update' end,
      'client', r.id, jsonb_build_object('name', r.first_name || ' ' || r.last_name, 'from_status', old.status, 'to_status', r.status));
  end if;
  return r;
end $$;

-- ============================================================ Paquetes

create or replace function gestion_sell_package(p_business uuid, p jsonb) returns gestion_packages
language plpgsql security definer set search_path = public as $$
declare
  r gestion_packages;
  v_client uuid := (p ->> 'client_id')::uuid;
  v_service gestion_services;
  v_pay numeric := gestion_money(nullif(p ->> 'payment_amount', '')::numeric);
begin
  perform gestion_require(p_business, 'packages.sell');
  if not exists (select 1 from gestion_clients where id = v_client and business_id = p_business) then raise exception 'Cliente no encontrado.'; end if;
  select * into v_service from gestion_services where id = nullif(p ->> 'service_id', '')::uuid and business_id = p_business;
  insert into gestion_packages (business_id, client_id, service_id, name, sessions_total, price, expires_on, notes, created_by, created_by_email)
  values (p_business, v_client, v_service.id,
          coalesce(nullif(btrim(p ->> 'name'), ''), v_service.name, 'Paquete'),
          coalesce(nullif(p ->> 'sessions_total', '')::int, v_service.sessions_included),
          gestion_money(coalesce(nullif(p ->> 'price', '')::numeric, v_service.price)),
          nullif(p ->> 'expires_on', '')::date, nullif(btrim(p ->> 'notes'), ''), auth.uid(), gestion_actor_email())
  returning * into r;
  perform gestion_log(p_business, 'package.sell', 'package', r.id, jsonb_build_object('client', v_client, 'sessions', r.sessions_total, 'price', r.price));
  if v_pay > 0 then
    perform gestion_register_payment(p_business, jsonb_build_object('client_id', v_client, 'amount', v_pay, 'method', p ->> 'payment_method',
      'package_id', r.id, 'concept', 'Paquete: ' || r.name));
  end if;
  return r;
end $$;

create or replace function gestion_package_remaining(p_package uuid) returns integer
language sql stable security definer set search_path = public as $$
  select p.sessions_total - (select count(*)::int from gestion_visits v where v.package_id = p.id and v.voided_at is null and v.status = 'asistio')
  from gestion_packages p where p.id = p_package and gestion_is_member(p.business_id)
$$;

-- ============================================================ Pagos

create or replace function gestion_register_payment(p_business uuid, p jsonb) returns gestion_payments
language plpgsql security definer set search_path = public as $$
declare
  r gestion_payments;
  v_client uuid := (p ->> 'client_id')::uuid;
  v_amount numeric := gestion_money(nullif(p ->> 'amount', '')::numeric);
  v_method text := nullif(btrim(p ->> 'method'), '');
  v_paid_at timestamptz := coalesce(nullif(p ->> 'paid_at', '')::timestamptz, now());
  v_num integer;
  v_visit uuid := nullif(p ->> 'visit_id', '')::uuid;
  v_package uuid := nullif(p ->> 'package_id', '')::uuid;
begin
  perform gestion_require(p_business, 'payments.create');
  if not exists (select 1 from gestion_clients where id = v_client and business_id = p_business) then raise exception 'Cliente no encontrado.'; end if;
  if v_amount is null or v_amount <= 0 then raise exception 'El importe tiene que ser mayor a 0.'; end if;
  if v_amount > 1000000 then raise exception 'El importe es demasiado alto.'; end if;
  if v_method is null or not exists (select 1 from gestion_settings where business_id = p_business and v_method = any (payment_methods)) then
    raise exception 'Elige un método de pago válido.';
  end if;
  if v_paid_at > now() + interval '1 hour' then raise exception 'La fecha del pago no puede ser futura.'; end if;
  if v_visit is not null and not exists (select 1 from gestion_visits where id = v_visit and client_id = v_client) then raise exception 'Asistencia no encontrada.'; end if;
  if v_package is not null and not exists (select 1 from gestion_packages where id = v_package and client_id = v_client) then raise exception 'Paquete no encontrado.'; end if;

  update gestion_settings set next_receipt = next_receipt + 1 where business_id = p_business returning next_receipt - 1 into v_num;
  if v_num is null then raise exception 'Falta la configuración del negocio.'; end if;

  insert into gestion_payments (business_id, client_id, amount, method, paid_at, visit_id, package_id, concept, notes, receipt_number, created_by, created_by_email)
  values (p_business, v_client, v_amount, v_method, v_paid_at, v_visit, v_package, nullif(btrim(p ->> 'concept'), ''), nullif(btrim(p ->> 'notes'), ''),
          v_num, auth.uid(), gestion_actor_email())
  returning * into r;
  perform gestion_log(p_business, 'payment.create', 'payment', r.id, jsonb_build_object('client', v_client, 'amount', v_amount, 'method', v_method, 'receipt', v_num));
  return r;
end $$;

create or replace function gestion_void_payment(p_payment uuid, p_reason text) returns gestion_payments
language plpgsql security definer set search_path = public as $$
declare
  r gestion_payments;
begin
  select * into r from gestion_payments where id = p_payment for update;
  perform gestion_require(r.business_id, 'payments.void');
  if r.voided_at is not null then raise exception 'Ese pago ya estaba anulado.'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo de la anulación.'; end if;
  update gestion_payments set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason) where id = p_payment returning * into r;
  perform gestion_log(r.business_id, 'payment.void', 'payment', r.id, jsonb_build_object('amount', r.amount, 'reason', r.void_reason, 'receipt', r.receipt_number));
  return r;
end $$;

-- ============================================================ Asistencias

-- Registro rápido: asistencia + (opcional) cobro en una sola operación.
create or replace function gestion_register_visit(p_business uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v gestion_visits;
  pay gestion_payments;
  v_client gestion_clients;
  v_service gestion_services;
  v_package gestion_packages;
  v_status text := coalesce(nullif(p ->> 'status', ''), 'asistio');
  v_at timestamptz := coalesce(nullif(p ->> 'occurred_at', '')::timestamptz, now());
  v_charge numeric;
  v_pay numeric := gestion_money(nullif(p ->> 'payment_amount', '')::numeric);
  v_appt uuid := nullif(p ->> 'appointment_id', '')::uuid;
begin
  perform gestion_require(p_business, 'visits.create');
  select * into v_client from gestion_clients where id = (p ->> 'client_id')::uuid and business_id = p_business;
  if v_client.id is null then raise exception 'Cliente no encontrado.'; end if;
  if v_client.status = 'suspendido' then raise exception 'Este cliente está suspendido. Reactívalo antes de registrar asistencias.'; end if;
  if v_status not in ('asistio', 'falto', 'cancelo') then raise exception 'Estado de asistencia inválido.'; end if;
  if v_at > now() + interval '1 hour' then raise exception 'La fecha no puede ser futura. Para el futuro usa la agenda.'; end if;
  if v_at < now() - interval '400 days' then raise exception 'La fecha es demasiado antigua.'; end if;

  if nullif(p ->> 'service_id', '') is not null then
    select * into v_service from gestion_services where id = (p ->> 'service_id')::uuid and business_id = p_business;
    if v_service.id is null then raise exception 'Servicio no encontrado.'; end if;
  end if;

  if nullif(p ->> 'package_id', '') is not null then
    select * into v_package from gestion_packages where id = (p ->> 'package_id')::uuid and client_id = v_client.id and voided_at is null for update;
    if v_package.id is null then raise exception 'Paquete no encontrado.'; end if;
    if v_package.expires_on is not null and v_package.expires_on < (v_at at time zone gestion_tz(p_business))::date then
      raise exception 'Ese paquete ya venció.';
    end if;
    if v_status = 'asistio' and gestion_package_remaining(v_package.id) <= 0 then raise exception 'El paquete no tiene sesiones disponibles.'; end if;
    v_charge := 0;
    if v_service.id is null and v_package.service_id is not null then
      select * into v_service from gestion_services where id = v_package.service_id;
    end if;
  else
    v_charge := gestion_money(coalesce(nullif(p ->> 'charge', '')::numeric, case when v_status = 'asistio' then v_service.price else 0 end, 0));
  end if;
  if v_charge < 0 or v_charge > 1000000 then raise exception 'El valor del servicio no es válido.'; end if;

  if v_appt is not null and not exists (select 1 from gestion_appointments where id = v_appt and client_id = v_client.id) then
    raise exception 'Cita no encontrada.';
  end if;

  insert into gestion_visits (business_id, client_id, service_id, service_name, occurred_at, status, charge, list_price, package_id, appointment_id, notes, created_by, created_by_email)
  values (p_business, v_client.id, v_service.id, coalesce(v_service.name, v_package.name), v_at, v_status, v_charge, v_service.price, v_package.id, v_appt,
          nullif(btrim(p ->> 'notes'), ''), auth.uid(), gestion_actor_email())
  returning * into v;

  if v_appt is not null then
    update gestion_appointments set status = case v_status when 'asistio' then 'atendida' when 'falto' then 'no_asistio' else 'cancelada' end where id = v_appt;
  end if;

  perform gestion_log(p_business, 'visit.create', 'visit', v.id,
    jsonb_build_object('client', v_client.id, 'status', v_status, 'charge', v_charge, 'package', v_package.id));

  if v_pay > 0 then
    pay := gestion_register_payment(p_business, jsonb_build_object('client_id', v_client.id, 'amount', v_pay, 'method', p ->> 'payment_method',
      'visit_id', v.id, 'paid_at', v_at, 'concept', coalesce(v_service.name, v_package.name, 'Sesión')));
  end if;

  return jsonb_build_object('visit', to_jsonb(v), 'payment', to_jsonb(pay));
end $$;

create or replace function gestion_void_visit(p_visit uuid, p_reason text) returns gestion_visits
language plpgsql security definer set search_path = public as $$
declare
  r gestion_visits;
begin
  select * into r from gestion_visits where id = p_visit for update;
  perform gestion_require(r.business_id, 'visits.void');
  if r.voided_at is not null then raise exception 'Esa asistencia ya estaba anulada.'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Escribe el motivo de la anulación.'; end if;
  update gestion_visits set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason) where id = p_visit returning * into r;
  perform gestion_log(r.business_id, 'visit.void', 'visit', r.id, jsonb_build_object('reason', r.void_reason, 'charge', r.charge));
  return r;
end $$;

-- ============================================================ Ajustes y descuentos

create or replace function gestion_add_adjustment(p_business uuid, p jsonb) returns gestion_adjustments
language plpgsql security definer set search_path = public as $$
declare
  r gestion_adjustments;
  v_client uuid := (p ->> 'client_id')::uuid;
begin
  perform gestion_require(p_business, 'finance.adjust');
  if not exists (select 1 from gestion_clients where id = v_client and business_id = p_business) then raise exception 'Cliente no encontrado.'; end if;
  insert into gestion_adjustments (business_id, client_id, kind, amount, reason, created_by, created_by_email)
  values (p_business, v_client, p ->> 'kind', gestion_money((p ->> 'amount')::numeric), btrim(p ->> 'reason'), auth.uid(), gestion_actor_email())
  returning * into r;
  perform gestion_log(p_business, 'adjustment.create', 'adjustment', r.id, jsonb_build_object('client', v_client, 'kind', r.kind, 'amount', r.amount, 'reason', r.reason));
  return r;
exception when check_violation then
  raise exception 'Revisa el tipo, el importe (mayor a 0) y el motivo (mínimo 3 letras).';
end $$;

create or replace function gestion_void_adjustment(p_adj uuid, p_reason text) returns gestion_adjustments
language plpgsql security definer set search_path = public as $$
declare
  r gestion_adjustments;
begin
  select * into r from gestion_adjustments where id = p_adj for update;
  perform gestion_require(r.business_id, 'finance.adjust');
  if r.voided_at is not null then raise exception 'Ya estaba anulado.'; end if;
  update gestion_adjustments set voided_at = now(), voided_by = auth.uid(), void_reason = nullif(btrim(p_reason), '') where id = p_adj returning * into r;
  perform gestion_log(r.business_id, 'adjustment.void', 'adjustment', r.id, jsonb_build_object('reason', r.void_reason));
  return r;
end $$;

-- ============================================================ Agenda

create or replace function gestion_save_appointment(p_business uuid, p jsonb) returns gestion_appointments
language plpgsql security definer set search_path = public as $$
declare
  r gestion_appointments;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_client uuid := nullif(p ->> 'client_id', '')::uuid;
  v_service uuid := nullif(p ->> 'service_id', '')::uuid;
begin
  perform gestion_require(p_business, 'agenda.edit');
  if v_client is not null and not exists (select 1 from gestion_clients where id = v_client and business_id = p_business) then raise exception 'Cliente no encontrado.'; end if;
  if v_service is not null and not exists (select 1 from gestion_services where id = v_service and business_id = p_business) then raise exception 'Servicio no encontrado.'; end if;
  if p ? 'status' and p ->> 'status' not in ('programada', 'atendida', 'cancelada', 'no_asistio') then raise exception 'Estado inválido.'; end if;
  if v_id is null then
    if v_client is null or nullif(p ->> 'starts_at', '') is null then raise exception 'Elige cliente, fecha y hora.'; end if;
    insert into gestion_appointments (business_id, client_id, service_id, starts_at, duration_min, notes, created_by, created_by_email)
    values (p_business, v_client, v_service, (p ->> 'starts_at')::timestamptz,
            coalesce(nullif(p ->> 'duration_min', '')::int, (select duration_min from gestion_services where id = v_service), 60),
            nullif(btrim(p ->> 'notes'), ''), auth.uid(), gestion_actor_email())
    returning * into r;
    perform gestion_log(p_business, 'appointment.create', 'appointment', r.id, jsonb_build_object('client', v_client, 'starts_at', r.starts_at));
  else
    update gestion_appointments set
      client_id = coalesce(v_client, client_id),
      service_id = case when p ? 'service_id' then v_service else service_id end,
      starts_at = coalesce(nullif(p ->> 'starts_at', '')::timestamptz, starts_at),
      duration_min = coalesce(nullif(p ->> 'duration_min', '')::int, duration_min),
      status = coalesce(nullif(p ->> 'status', ''), status),
      notes = case when p ? 'notes' then nullif(btrim(p ->> 'notes'), '') else notes end
    where id = v_id and business_id = p_business returning * into r;
    if r.id is null then raise exception 'Cita no encontrada.'; end if;
    perform gestion_log(p_business, 'appointment.update', 'appointment', r.id, p);
  end if;
  return r;
end $$;

-- ============================================================ Notas clínicas (lectura auditada)

create or replace function gestion_clinical_list(p_client uuid) returns setof gestion_clinical_notes
language plpgsql security definer set search_path = public as $$
declare
  v_business uuid;
begin
  select business_id into v_business from gestion_clients where id = p_client;
  perform gestion_require(v_business, 'clinical.view');
  if not coalesce((select clinical_enabled from gestion_settings where business_id = v_business), false) then
    raise exception 'Los datos clínicos no están activados en este negocio.';
  end if;
  perform gestion_log(v_business, 'clinical.read', 'client', p_client, '{}');
  return query select * from gestion_clinical_notes where client_id = p_client order by created_at desc;
end $$;

create or replace function gestion_clinical_add(p_client uuid, p_body text) returns gestion_clinical_notes
language plpgsql security definer set search_path = public as $$
declare
  v_business uuid;
  r gestion_clinical_notes;
begin
  select business_id into v_business from gestion_clients where id = p_client;
  perform gestion_require(v_business, 'clinical.edit');
  if not coalesce((select clinical_enabled from gestion_settings where business_id = v_business), false) then
    raise exception 'Los datos clínicos no están activados en este negocio.';
  end if;
  insert into gestion_clinical_notes (business_id, client_id, body, created_by, created_by_email)
  values (v_business, p_client, btrim(p_body), auth.uid(), gestion_actor_email()) returning * into r;
  perform gestion_log(v_business, 'clinical.write', 'client', p_client, '{}');
  return r;
end $$;

-- ============================================================ Cálculos

-- Saldos de todos los clientes del negocio (o de uno). Interno: lo usan las funciones públicas de abajo.
create or replace function gestion_balances_internal(p_business uuid, p_client uuid default null)
returns table (client_id uuid, charges numeric, credits numeric, paid numeric, discounts numeric, balance numeric)
language sql stable security definer set search_path = public as $$
  with c as (
    select id from gestion_clients where business_id = p_business and (p_client is null or id = p_client)
  ),
  ch as (
    select client_id, sum(charge) s from gestion_visits where business_id = p_business and voided_at is null group by client_id
    union all
    select client_id, sum(price) from gestion_packages where business_id = p_business and voided_at is null group by client_id
    union all
    select client_id, sum(amount) from gestion_adjustments where business_id = p_business and voided_at is null and kind = 'cargo' group by client_id
  ),
  pa as (select client_id, sum(amount) s from gestion_payments where business_id = p_business and voided_at is null group by client_id),
  di as (select client_id, sum(amount) s from gestion_adjustments where business_id = p_business and voided_at is null and kind = 'descuento' group by client_id)
  select c.id,
         coalesce((select sum(s) from ch where ch.client_id = c.id), 0),
         coalesce((select s from pa where pa.client_id = c.id), 0) + coalesce((select s from di where di.client_id = c.id), 0),
         coalesce((select s from pa where pa.client_id = c.id), 0),
         coalesce((select s from di where di.client_id = c.id), 0),
         coalesce((select sum(s) from ch where ch.client_id = c.id), 0)
           - coalesce((select s from pa where pa.client_id = c.id), 0) - coalesce((select s from di where di.client_id = c.id), 0)
  from c
$$;

create or replace function gestion_balances(p_business uuid)
returns table (client_id uuid, charges numeric, credits numeric, paid numeric, discounts numeric, balance numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (gestion_can(p_business, 'finance.view') or gestion_can(p_business, 'reports.view')) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  return query select * from gestion_balances_internal(p_business, null);
end $$;

-- Resumen de un cliente con un clic.
create or replace function gestion_client_summary(p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_business uuid;
  v_tz text;
  v_month_start timestamptz;
  b record;
  v jsonb;
begin
  select business_id into v_business from gestion_clients where id = p_client;
  if v_business is null or not (gestion_can(v_business, 'finance.view') or gestion_can(v_business, 'clients.history')
                                 or gestion_can(v_business, 'payments.create')) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  v_tz := gestion_tz(v_business);
  v_month_start := date_trunc('month', now() at time zone v_tz) at time zone v_tz;
  select * into b from gestion_balances_internal(v_business, p_client);
  select jsonb_build_object(
    'sessions_month', (select count(*) from gestion_visits where client_id = p_client and voided_at is null and status = 'asistio' and occurred_at >= v_month_start),
    'sessions_total', (select count(*) from gestion_visits where client_id = p_client and voided_at is null and status = 'asistio'),
    'absences_total', (select count(*) from gestion_visits where client_id = p_client and voided_at is null and status = 'falto'),
    'paid_month', (select coalesce(sum(amount), 0) from gestion_payments where client_id = p_client and voided_at is null and paid_at >= v_month_start),
    'paid_total', b.paid,
    'charges_total', b.charges,
    'discounts_total', b.discounts,
    'balance', b.balance,
    'last_payment', (select jsonb_build_object('amount', amount, 'paid_at', paid_at, 'method', method) from gestion_payments
                     where client_id = p_client and voided_at is null order by paid_at desc limit 1),
    'last_visit', (select max(occurred_at) from gestion_visits where client_id = p_client and voided_at is null and status = 'asistio'),
    'next_appointment', (select jsonb_build_object('id', id, 'starts_at', starts_at) from gestion_appointments
                         where client_id = p_client and status = 'programada' and starts_at >= now() order by starts_at limit 1),
    'packages', coalesce((select jsonb_agg(jsonb_build_object('id', pk.id, 'name', pk.name, 'sessions_total', pk.sessions_total,
                          'remaining', gestion_package_remaining(pk.id), 'expires_on', pk.expires_on, 'price', pk.price) order by pk.purchased_at desc)
                          from gestion_packages pk where pk.client_id = p_client and pk.voided_at is null), '[]'::jsonb)
  ) into v;
  return v;
end $$;

-- Panel principal.
create or replace function gestion_dashboard(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_today date;
  v_month_start date;
  v_prev_start date;
  v_prev_same date;
  v_from date;
begin
  perform gestion_require(p_business, 'dashboard.view');
  v_tz := gestion_tz(p_business);
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_prev_start := (v_month_start - interval '1 month')::date;
  -- Mes anterior hasta el mismo día del mes (comparación justa).
  v_prev_same := least((v_prev_start + (v_today - v_month_start))::date, (v_month_start - 1));
  v_from := v_today - 29;

  return jsonb_build_object(
    'today', v_today,
    'clients_total', (select count(*) from gestion_clients where business_id = p_business),
    'clients_active', (select count(*) from gestion_clients where business_id = p_business and status = 'activo'),
    'clients_new_month', (select count(*) from gestion_clients where business_id = p_business and registered_at >= v_month_start),
    'visits_today', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                      and (occurred_at at time zone v_tz)::date = v_today),
    'sessions_month', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                        and (occurred_at at time zone v_tz)::date between v_month_start and v_today),
    'sessions_prev', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                       and (occurred_at at time zone v_tz)::date between v_prev_start and v_prev_same),
    'income_today', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                      and (paid_at at time zone v_tz)::date = v_today),
    'income_month', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                      and (paid_at at time zone v_tz)::date between v_month_start and v_today),
    'income_prev', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                     and (paid_at at time zone v_tz)::date between v_prev_start and v_prev_same),
    'pending_total', (select coalesce(sum(balance), 0) from gestion_balances_internal(p_business) where balance > 0),
    'debtors', (select count(*) from gestion_balances_internal(p_business) where balance > 0),
    'credit_total', (select coalesce(-sum(balance), 0) from gestion_balances_internal(p_business) where balance < 0),
    'series', (select jsonb_agg(jsonb_build_object(
                  'day', d::date,
                  'visits', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                              and (occurred_at at time zone v_tz)::date = d::date),
                  'income', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                              and (paid_at at time zone v_tz)::date = d::date)) order by d)
               from generate_series(v_from, v_today, interval '1 day') d),
    'by_service', coalesce((select jsonb_agg(x order by x.n desc) from (
                  select coalesce(service_name, 'Sin servicio') as name, count(*) as n from gestion_visits
                  where business_id = p_business and voided_at is null and status = 'asistio'
                    and (occurred_at at time zone v_tz)::date between v_month_start and v_today
                  group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(x order by x.starts_at) from (
                  select a.id, a.starts_at, a.client_id, c.first_name || ' ' || c.last_name as client_name, s.name as service_name
                  from gestion_appointments a join gestion_clients c on c.id = a.client_id left join gestion_services s on s.id = a.service_id
                  where a.business_id = p_business and a.status = 'programada' and a.starts_at >= now() - interval '1 hour'
                  order by a.starts_at limit 8) x), '[]'::jsonb),
    'pending_packages', coalesce((select jsonb_agg(x) from (
                  select pk.id, pk.client_id, c.first_name || ' ' || c.last_name as client_name, pk.name, gestion_package_remaining(pk.id) as remaining
                  from gestion_packages pk join gestion_clients c on c.id = pk.client_id
                  where pk.business_id = p_business and pk.voided_at is null and gestion_package_remaining(pk.id) > 0
                    and (pk.expires_on is null or pk.expires_on >= v_today)
                  order by pk.purchased_at desc limit 8) x), '[]'::jsonb)
  );
end $$;

-- Reportes agrupados por día / semana / mes entre dos fechas (incluidas).
create or replace function gestion_report(p_business uuid, p_from date, p_to date, p_group text default 'day') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_unit text := case when p_group in ('day', 'week', 'month') then p_group else 'day' end;
begin
  perform gestion_require(p_business, 'reports.view');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Revisa el rango de fechas.'; end if;
  if p_to - p_from > 1100 then raise exception 'El rango máximo es de 3 años.'; end if;
  v_tz := gestion_tz(p_business);
  return jsonb_build_object(
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
                  'period', g::date,
                  'visits', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                              and date_trunc(v_unit, (occurred_at at time zone v_tz)::date)::date = g::date
                              and (occurred_at at time zone v_tz)::date between p_from and p_to),
                  'absences', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'falto'
                              and date_trunc(v_unit, (occurred_at at time zone v_tz)::date)::date = g::date
                              and (occurred_at at time zone v_tz)::date between p_from and p_to),
                  'charges', (select coalesce(sum(charge), 0) from gestion_visits where business_id = p_business and voided_at is null
                              and date_trunc(v_unit, (occurred_at at time zone v_tz)::date)::date = g::date
                              and (occurred_at at time zone v_tz)::date between p_from and p_to),
                  'income', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                              and date_trunc(v_unit, (paid_at at time zone v_tz)::date)::date = g::date
                              and (paid_at at time zone v_tz)::date between p_from and p_to)) order by g), '[]'::jsonb)
               from generate_series(date_trunc(v_unit, p_from::timestamp), p_to::timestamp, ('1 ' || v_unit)::interval) g),
    'by_service', coalesce((select jsonb_agg(x order by x.sessions desc) from (
                  select coalesce(service_name, 'Sin servicio') as name, count(*) filter (where status = 'asistio') as sessions, sum(charge) as charges
                  from gestion_visits where business_id = p_business and voided_at is null
                    and (occurred_at at time zone v_tz)::date between p_from and p_to group by 1) x), '[]'::jsonb),
    'by_method', coalesce((select jsonb_agg(x order by x.total desc) from (
                  select method, count(*) as n, sum(amount) as total from gestion_payments where business_id = p_business and voided_at is null
                    and (paid_at at time zone v_tz)::date between p_from and p_to group by 1) x), '[]'::jsonb),
    'totals', (select jsonb_build_object(
                  'visits', (select count(*) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                             and (occurred_at at time zone v_tz)::date between p_from and p_to),
                  'clients', (select count(distinct client_id) from gestion_visits where business_id = p_business and voided_at is null and status = 'asistio'
                             and (occurred_at at time zone v_tz)::date between p_from and p_to),
                  'charges', (select coalesce(sum(charge), 0) from gestion_visits where business_id = p_business and voided_at is null
                             and (occurred_at at time zone v_tz)::date between p_from and p_to)
                           + (select coalesce(sum(price), 0) from gestion_packages where business_id = p_business and voided_at is null
                             and (purchased_at at time zone v_tz)::date between p_from and p_to),
                  'income', (select coalesce(sum(amount), 0) from gestion_payments where business_id = p_business and voided_at is null
                             and (paid_at at time zone v_tz)::date between p_from and p_to),
                  'discounts', (select coalesce(sum(amount), 0) from gestion_adjustments where business_id = p_business and voided_at is null and kind = 'descuento'
                             and (created_at at time zone v_tz)::date between p_from and p_to)))
  );
end $$;

-- Datos de un comprobante.
create or replace function gestion_receipt(p_payment uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r gestion_payments;
begin
  select * into r from gestion_payments where id = p_payment;
  if r.id is null or not (gestion_can(r.business_id, 'receipts.issue') or gestion_can(r.business_id, 'payments.view')) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'payment', to_jsonb(r),
    'client', (select jsonb_build_object('name', first_name || ' ' || last_name, 'phone', phone, 'email', email) from gestion_clients where id = r.client_id),
    'business', (select jsonb_build_object('name', coalesce(s.display_name, b.name), 'address', b.address, 'phone', b.phone,
                   'currency', s.currency, 'footer', s.receipt_footer, 'client_singular', s.client_singular, 'timezone', s.timezone)
                 from businesses b join gestion_settings s on s.business_id = b.id where b.id = r.business_id),
    'balance_after', (select balance from gestion_balances_internal(r.business_id, r.client_id))
  );
end $$;

-- Copia de seguridad completa de un negocio (JSON) para quien puede exportar. No incluye notas clínicas.
create or replace function gestion_export_all(p_business uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform gestion_require(p_business, 'reports.export');
  perform gestion_require(p_business, 'settings.manage');
  perform gestion_log(p_business, 'backup.export', 'business', p_business, '{}');
  return jsonb_build_object(
    'exported_at', now(),
    'settings', (select to_jsonb(s) from gestion_settings s where business_id = p_business),
    'services', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_services x where business_id = p_business), '[]'),
    'clients', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_clients x where business_id = p_business), '[]'),
    'packages', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_packages x where business_id = p_business), '[]'),
    'appointments', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_appointments x where business_id = p_business), '[]'),
    'visits', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_visits x where business_id = p_business), '[]'),
    'payments', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_payments x where business_id = p_business), '[]'),
    'adjustments', coalesce((select jsonb_agg(to_jsonb(x)) from gestion_adjustments x where business_id = p_business), '[]')
  );
end $$;

-- ============================================================ Permisos de ejecución

-- Ayudantes internos: nadie con cuenta los llama directo.
revoke execute on function gestion_bootstrap(uuid) from public, anon, authenticated;
revoke execute on function gestion_log(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function gestion_balances_internal(uuid, uuid) from public, anon, authenticated;
revoke execute on function gestion_require(uuid, text) from public, anon, authenticated;
revoke execute on function gestion_actor_email() from public, anon, authenticated;
revoke execute on function gestion_tz(uuid) from public, anon, authenticated;

grant execute on function
  gestion_all_permissions(), gestion_permissions(uuid), gestion_can(uuid, text), gestion_is_member(uuid), gestion_is_owner(uuid),
  gestion_my_access(uuid), gestion_save_settings(uuid, jsonb), gestion_save_service(uuid, jsonb),
  gestion_save_role(uuid, uuid, text, text[]), gestion_delete_role(uuid), gestion_invite_staff(uuid, text, uuid, text),
  gestion_set_staff_role(uuid, uuid), gestion_remove_staff(uuid), gestion_save_client(uuid, jsonb),
  gestion_sell_package(uuid, jsonb), gestion_register_payment(uuid, jsonb), gestion_void_payment(uuid, text),
  gestion_register_visit(uuid, jsonb), gestion_void_visit(uuid, text), gestion_add_adjustment(uuid, jsonb), gestion_void_adjustment(uuid, text),
  gestion_save_appointment(uuid, jsonb), gestion_clinical_list(uuid), gestion_clinical_add(uuid, text),
  gestion_balances(uuid), gestion_client_summary(uuid), gestion_dashboard(uuid), gestion_report(uuid, date, date, text),
  gestion_receipt(uuid), gestion_export_all(uuid)
to authenticated;
revoke execute on function gestion_my_access(uuid) from anon;

-- Sin sesión (anon) no se ejecuta ninguna función de gestión.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'gestion\_%' loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;
