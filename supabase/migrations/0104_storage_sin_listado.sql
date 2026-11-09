-- Auditoría (9 nov 2026): las carpetas públicas dejaban LISTAR todos los archivos con la API de storage.
-- Los links públicos (/object/public/...) no pasan por estas reglas, así que las fotos se siguen viendo igual
-- en la app y la web. Ahora listar o leer por la API solo lo puede el dueño de la carpeta (o un admin),
-- que es lo mismo que ya hacía falta para subir o reemplazar (upsert) el archivo.
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: owner read" on storage.objects for select
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "profile-banners: public read" on storage.objects;
create policy "profile-banners: owner read" on storage.objects for select
  using (bucket_id = 'profile-banners' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "group-photos: public read" on storage.objects;
create policy "group-photos: creator read" on storage.objects for select
  using (bucket_id = 'group-photos' and (is_admin() or exists (
    select 1 from groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid())));

drop policy if exists "business-logos: public read" on storage.objects;
create policy "business-logos: owner read" on storage.objects for select
  using (bucket_id = 'business-logos' and (is_admin() or exists (
    select 1 from businesses b where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid())));

drop policy if exists "benefit-images: public read" on storage.objects;
create policy "benefit-images: owner read" on storage.objects for select
  using (bucket_id = 'benefit-images' and (is_admin() or exists (
    select 1 from businesses b where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid())));

drop policy if exists "route-prizes: public read" on storage.objects;
create policy "route-prizes: admin read" on storage.objects for select
  using (bucket_id = 'route-prizes' and is_admin());

-- Premios de la Ruta: solo imágenes y hasta 5 MB, como las otras carpetas.
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id = 'route-prizes';
