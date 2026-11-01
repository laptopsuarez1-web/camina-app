-- Ficha de amigo: los grupos que tienen en común.
-- friend_extras(p_user): solo para uno mismo o un amigo que aceptó (mismo criterio que los pasos en friend_card).
--   common_groups: grupos de los que son miembros las dos personas (id y nombre).
-- Idempotente: sí.
-- Cómo se revierte: drop function friend_extras(uuid);
create or replace function friend_extras(p_user uuid) returns jsonb as $f$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  if p_user <> v_me and (users_blocked(v_me, p_user) or not are_friends(v_me, p_user)) then
    return null;
  end if;
  return jsonb_build_object(
    'common_groups', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name) order by g.name)
      from groups g
      where exists (select 1 from group_members a where a.group_id = g.id and a.user_id = v_me)
        and exists (select 1 from group_members b where b.group_id = g.id and b.user_id = p_user)
    ), '[]'::jsonb)
  );
end;
$f$ language plpgsql stable security definer set search_path = public;

revoke execute on function friend_extras(uuid) from public, anon;
grant execute on function friend_extras(uuid) to authenticated;
