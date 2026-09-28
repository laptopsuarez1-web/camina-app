-- Buckets de Storage para fotos de perfil y logos de comercio.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Cada usuario sube/reemplaza su propio avatar en avatars/<user_id>/...
create policy "avatars: public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars: owner write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- El dueño del comercio sube el logo en business-logos/<business_id>/...
create policy "business-logos: public read" on storage.objects for select
  using (bucket_id = 'business-logos');
create policy "business-logos: owner write" on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid()
    )
  );
create policy "business-logos: owner update" on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid()
    )
  );
