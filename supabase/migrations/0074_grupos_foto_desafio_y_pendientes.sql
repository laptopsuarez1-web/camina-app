-- 0074: grupos — foto del grupo, cancelar desafíos e invitaciones pendientes visibles.
-- 1) Las políticas de group-photos comparaban la carpeta con g.name (nombre del grupo) en vez del nombre del archivo: nadie podía subir la foto.
alter policy "group-photos: creator write" on storage.objects
  with check (bucket_id = 'group-photos' and exists (select 1 from public.groups g where g.id::text = (storage.foldername(objects.name))[1] and g.created_by = auth.uid()));
alter policy "group-photos: creator update" on storage.objects
  using (bucket_id = 'group-photos' and exists (select 1 from public.groups g where g.id::text = (storage.foldername(objects.name))[1] and g.created_by = auth.uid()));
alter policy "group-photos: creator delete" on storage.objects
  using (bucket_id = 'group-photos' and exists (select 1 from public.groups g where g.id::text = (storage.foldername(objects.name))[1] and g.created_by = auth.uid()));

-- 2) Cancelar un desafío activo: quien lo creó (o quien creó el grupo), solo si nadie más se sumó o todavía no empezó. Devuelve los puntos puestos.
create or replace function cancel_group_challenge(p_challenge uuid) returns void as $f$
declare
  v_ttl interval := (points_ttl_days() || ' days')::interval;
  c group_challenges%rowtype;
  v_today date := (now() at time zone 'America/La_Paz')::date;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from group_challenges where id = p_challenge and status = 'active' for update;
  if not found then raise exception 'Ese desafío ya no está en marcha'; end if;
  if c.created_by <> auth.uid() and not exists (select 1 from groups where id = c.group_id and created_by = auth.uid()) then
    raise exception 'Solo quien creó el desafío o el grupo puede eliminarlo';
  end if;
  if c.start_day <= v_today and exists (select 1 from group_challenge_entries where challenge_id = c.id and user_id <> auth.uid()) then
    raise exception 'Ya empezó y hay más gente adentro: espera a que termine';
  end if;
  insert into points_ledger (user_id, amount, reason, expires_at)
  select e.user_id, e.stake_paid, 'challenge', now() + v_ttl from group_challenge_entries e where e.challenge_id = c.id and e.stake_paid > 0;
  delete from group_challenges where id = c.id;
end;
$f$ language plpgsql security definer set search_path = public;
revoke all on function cancel_group_challenge(uuid) from public, anon;
grant execute on function cancel_group_challenge(uuid) to authenticated;

-- 3) Invitaciones pendientes del grupo, para que quien está dentro vea a quién invitaron.
create or replace function group_pending_invitees(p_group uuid)
returns table (user_id uuid, full_name text, photo_url text) as $$
  select p.id, p.full_name, p.photo_url
  from group_invites i join profiles p on p.id = i.invitee_id
  where i.group_id = p_group and is_group_member(p_group)
  order by i.created_at;
$$ language sql stable security definer set search_path = public;
revoke all on function group_pending_invitees(uuid) from public, anon;
grant execute on function group_pending_invitees(uuid) to authenticated;
