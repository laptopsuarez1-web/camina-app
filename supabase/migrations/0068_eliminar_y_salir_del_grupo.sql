-- Eliminar grupo (solo quien lo creó) y salir del grupo (cualquier otro miembro).
-- Miembros, chat, desafíos, historial e invitaciones se borran solos (on delete cascade).
-- Si hay un desafío activo con puntos puestos, se devuelven a cada persona antes de borrar.

create or replace function delete_group(p_group uuid) returns void as $f$
declare
  v_ttl interval := (points_ttl_days() || ' days')::interval;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  perform 1 from groups where id = p_group and created_by = auth.uid() for update;
  if not found then raise exception 'Solo quien creó el grupo puede eliminarlo'; end if;

  insert into points_ledger (user_id, amount, reason, expires_at)
  select e.user_id, e.stake_paid, 'challenge', now() + v_ttl
  from group_challenge_entries e
  join group_challenges c on c.id = e.challenge_id
  where c.group_id = p_group and c.status = 'active' and e.stake_paid > 0;

  delete from groups where id = p_group;
end;
$f$ language plpgsql security definer set search_path = public;

create or replace function leave_group(p_group uuid) returns void as $f$
declare
  v_next uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (
    select 1 from group_challenge_entries e join group_challenges c on c.id = e.challenge_id
    where c.group_id = p_group and c.status = 'active' and e.user_id = auth.uid()
  ) then
    raise exception 'Estás en un desafío activo: espera a que termine para salir';
  end if;
  if exists (select 1 from groups where id = p_group and created_by = auth.uid()) then
    -- quien creó el grupo sale: la administración pasa al miembro más antiguo; si no queda nadie, se elimina
    select user_id into v_next from group_members
    where group_id = p_group and user_id <> auth.uid() order by joined_at limit 1;
    if v_next is null then
      perform delete_group(p_group);
      return;
    end if;
    update groups set created_by = v_next where id = p_group;
  end if;
  delete from group_members where group_id = p_group and user_id = auth.uid();
end;
$f$ language plpgsql security definer set search_path = public;

revoke all on function delete_group(uuid), leave_group(uuid) from public, anon;
grant execute on function delete_group(uuid), leave_group(uuid) to authenticated;
