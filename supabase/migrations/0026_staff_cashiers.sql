-- Cajeros: el dueño da acceso a empleados que solo pueden confirmar canjes de su comercio -------------

create table if not exists business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  email text not null check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);
alter table business_staff enable row level security;

-- El dueño ve a su equipo; cada empleado ve su propia fila. Escribir solo con las funciones de abajo.
create policy "staff: owner or self read" on business_staff for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

create or replace function is_business_member(p_business uuid) returns boolean as $$
  select exists (select 1 from businesses b where b.id = p_business and b.owner_user_id = auth.uid())
      or exists (select 1 from business_staff s where s.business_id = p_business and s.user_id = auth.uid());
$$ language sql stable security definer set search_path = public;
grant execute on function is_business_member(uuid) to authenticated;

-- El dueño invita a un empleado por correo (máximo 5 por comercio).
create or replace function add_staff(p_business_id uuid, p_email text) returns business_staff as $$
declare
  r business_staff;
  v_email text := lower(btrim(p_email));
begin
  if not exists (select 1 from businesses where id = p_business_id and owner_user_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribí un correo válido.';
  end if;
  if (select count(*) from business_staff where business_id = p_business_id) >= 5 then
    raise exception 'Podés tener hasta 5 cajeros.';
  end if;
  if exists (select 1 from businesses b join auth.users u on u.id = b.owner_user_id where b.id = p_business_id and lower(u.email) = v_email) then
    raise exception 'Ese correo es el tuyo.';
  end if;
  insert into business_staff (business_id, email) values (p_business_id, v_email)
  on conflict (business_id, email) do update set email = excluded.email
  returning * into r;
  return r;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function add_staff(uuid, text) to authenticated;

create or replace function remove_staff(p_staff_id uuid) returns void as $$
begin
  delete from business_staff s
  where s.id = p_staff_id
    and exists (select 1 from businesses b where b.id = s.business_id and b.owner_user_id = auth.uid());
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function remove_staff(uuid) to authenticated;

-- Cuando el empleado crea su cuenta con el correo invitado, se vincula solo.
create or replace function claim_staff_invite() returns uuid as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_business uuid;
begin
  if auth.uid() is null or v_email = '' then
    return null;
  end if;
  update business_staff set user_id = auth.uid() where email = v_email and user_id is null;
  select business_id into v_business from business_staff where user_id = auth.uid() order by created_at limit 1;
  return v_business;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function claim_staff_invite() to authenticated;

-- Los empleados pueden ver y confirmar los canjes de su comercio.
drop policy if exists "redemptions: select own or business owner" on redemptions;
create policy "redemptions: select own or business member" on redemptions for select
  using (auth.uid() = user_id or is_business_member(business_id));

create or replace function confirm_redemption_code(p_business_id uuid, p_code text)
returns redemptions as $$
declare
  v_row redemptions;
begin
  if not is_business_member(p_business_id) then
    raise exception 'No autorizado';
  end if;

  select * into v_row from redemptions
  where business_id = p_business_id and code = p_code
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Código no encontrado';
  end if;

  if v_row.status = 'confirmed' then
    raise exception 'Ese código ya fue confirmado';
  end if;

  if v_row.status <> 'pending' or v_row.code_expires_at < now() then
    update redemptions set status = 'expired' where id = v_row.id;
    raise exception 'Ese código ya venció';
  end if;

  update redemptions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;
