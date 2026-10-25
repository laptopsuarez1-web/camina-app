-- 0064 — El cupo fundador (3 meses gratis de Paso Firme) cuenta desde el lanzamiento de la app, no desde que se otorga.
--
-- Una sola fecha de lanzamiento (app_launch.launch_at). Mientras sea null los fundadores tienen founder_until = null
-- ("empieza cuando salga la app") y end_founder_periods no los toca. Al fijarla, todos vencen 3 meses después.
create table if not exists app_launch (
  id boolean primary key default true check (id),
  launch_at timestamptz
);
insert into app_launch (id, launch_at) values (true, null) on conflict (id) do nothing;

alter table app_launch enable row level security;
drop policy if exists app_launch_read on app_launch;
create policy app_launch_read on app_launch for select to authenticated using (true);
revoke insert, update, delete on app_launch from authenticated, anon;

-- Solo el equipo de Camina fija (o borra, con null) la fecha; recalcula el vencimiento de todos los fundadores.
create or replace function set_launch_date(p_launch_at timestamptz) returns timestamptz as $$
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede fijar la fecha de lanzamiento.';
  end if;
  update app_launch set launch_at = p_launch_at where id;
  update businesses
  set founder_until = case when p_launch_at is null then null else p_launch_at + interval '3 months' end
  where founder;
  return p_launch_at;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function set_launch_date(timestamptz) from public, anon;
grant execute on function set_launch_date(timestamptz) to authenticated;

-- Si la app ya salió, el nuevo fundador tiene sus 3 meses desde hoy; si no, desde el lanzamiento.
create or replace function grant_founder(p_business_id uuid) returns businesses as $$
declare
  b businesses;
  v_launch timestamptz;
begin
  if not is_admin() then
    raise exception 'Solo el equipo de Camina puede activar el programa fundador.';
  end if;
  if (select count(*) from businesses where founder and id <> p_business_id) >= 20 then
    raise exception 'Los 20 cupos del programa fundador ya están cubiertos.';
  end if;
  select launch_at into v_launch from app_launch where id;
  update businesses
  set founder = true,
      founder_until = case when v_launch is null then null else greatest(now(), v_launch) + interval '3 months' end,
      plan = 'paso_firme',
      plan_started_at = now(),
      pending_plan = null
  where id = p_business_id
  returning * into b;
  return b;
end;
$$ language plpgsql security definer set search_path = public;

-- Los fundadores que ya existen pasan a esperar el lanzamiento (launch_at todavía es null).
update businesses set founder_until = null where founder;
