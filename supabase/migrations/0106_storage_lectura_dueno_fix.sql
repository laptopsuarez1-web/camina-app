-- Fix de 0104: las reglas de lectura comparaban la carpeta con g.name / b.name (el NOMBRE del grupo o local) en vez del
-- nombre del archivo, así que nadie podía subir ni reemplazar fotos (el reemplazo necesita leer). Ahora usan objects.name.
drop policy if exists "group-photos: creator read" on storage.objects;
create policy "group-photos: creator read" on storage.objects for select
  using (bucket_id = 'group-photos' and (is_admin() or exists (
    select 1 from public.groups g where g.id::text = (storage.foldername(objects.name))[1] and g.created_by = auth.uid())));

drop policy if exists "business-logos: owner read" on storage.objects;
create policy "business-logos: owner read" on storage.objects for select
  using (bucket_id = 'business-logos' and (is_admin() or exists (
    select 1 from public.businesses b where b.id::text = (storage.foldername(objects.name))[1] and b.owner_user_id = auth.uid())));

drop policy if exists "benefit-images: owner read" on storage.objects;
create policy "benefit-images: owner read" on storage.objects for select
  using (bucket_id = 'benefit-images' and (is_admin() or exists (
    select 1 from public.businesses b where b.id::text = (storage.foldername(objects.name))[1] and b.owner_user_id = auth.uid())));
