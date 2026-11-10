-- La regla de lectura de "route-photos" llamaba a users_blocked() y are_friends(), que nadie con cuenta puede ejecutar
-- (0056). Postgres evalúa todas las reglas de lectura de storage.objects, así que CUALQUIER lectura con cuenta fallaba
-- ("permission denied for function users_blocked"), y con eso las subidas que reemplazan (fotos de grupo, perfil, locales).
-- Ahora usa un ayudante que solo responde sobre la persona que pregunta (auth.uid()), así no sirve para espiar a otros.
create or replace function can_see_route_photo(p_owner uuid) returns boolean as $$
  select auth.uid() is not null
    and not users_blocked(auth.uid(), p_owner)
    and (are_friends(auth.uid(), p_owner) or exists (
      select 1 from group_members a join group_members b on a.group_id = b.group_id
      where a.user_id = auth.uid() and b.user_id = p_owner));
$$ language sql stable security definer set search_path = public;
revoke execute on function can_see_route_photo(uuid) from public, anon;
grant execute on function can_see_route_photo(uuid) to authenticated;

drop policy if exists "route-photos: owner friends groups read" on storage.objects;
create policy "route-photos: owner friends groups read" on storage.objects for select to authenticated
  using (bucket_id = 'route-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or is_admin()
    or ((storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' and can_see_route_photo(((storage.foldername(name))[1])::uuid))));
