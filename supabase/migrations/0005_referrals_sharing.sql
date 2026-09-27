-- Soporte para compartir real: capturar un referido desde un link de invitación
-- (camina://r/<referrerId>) y leer el tamaño de un grupo antes de unirse
-- (camina://join-group/<groupId>), sin exponer group_members a no-miembros.

-- referrals no tenía política de insert: el cliente no puede escribir ahí
-- directamente (el crédito de Puntos depende de que nadie pueda inventarse
-- referidos). Esta función corre como SECURITY DEFINER y hace las
-- validaciones server-side: no autorreferidos, referente debe existir, y es
-- idempotente (un usuario solo puede ser referido una vez, por la unique en
-- referred_user_id).
create or replace function capture_referral(p_referrer_id uuid) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sin sesión';
  end if;
  if p_referrer_id is null or p_referrer_id = v_user_id then
    return;
  end if;
  if not exists (select 1 from profiles where id = p_referrer_id) then
    return;
  end if;
  if exists (select 1 from referrals where referred_user_id = v_user_id) then
    return;
  end if;

  insert into referrals (referrer_user_id, referred_user_id) values (p_referrer_id, v_user_id);
  update profiles set referred_by = p_referrer_id where id = v_user_id and referred_by is null;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function capture_referral(uuid) to authenticated;

-- Deja ver cuántos miembros tiene un grupo antes de unirse (la tabla
-- group_members solo es legible por miembros, así que la pantalla de "te
-- invitaron a este grupo" necesita esto para no mostrar el conteo en cero).
create or replace function group_member_count(p_group_id uuid) returns integer as $$
  select count(*)::int from group_members where group_id = p_group_id;
$$ language sql stable security definer set search_path = public;

grant execute on function group_member_count(uuid) to authenticated, anon;

-- Sin esto, el chat de grupo (group_notes) se suscribe a un canal realtime
-- que nunca recibe nada: Postgres solo publica los cambios de las tablas
-- agregadas explícitamente a supabase_realtime.
alter publication supabase_realtime add table group_notes;

