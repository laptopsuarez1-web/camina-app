-- Marcos (10 nov): las fotos de la Ruta las ven solo la persona, sus amigos y quienes comparten un grupo con ella.
-- Cómo se revierte: recrear "route-photos: owner read" (solo la carpeta propia) y borrar esta política.
drop policy if exists "route-photos: owner read" on storage.objects;
create policy "route-photos: owner friends groups read" on storage.objects for select to authenticated
  using (bucket_id = 'route-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or is_admin()
    or (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and not users_blocked(auth.uid(), ((storage.foldername(name))[1])::uuid)
      and (
        are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
        or exists (select 1 from group_members a join group_members b on a.group_id = b.group_id
                   where a.user_id = auth.uid() and b.user_id = ((storage.foldername(name))[1])::uuid)
      )
    )
  ));
