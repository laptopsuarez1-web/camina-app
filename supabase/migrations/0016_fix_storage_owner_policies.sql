-- Bug real, no de esta sesión: en "business-logos: owner write/update" y
-- "benefit-images: owner write/update", el "name" dentro del EXISTS (select
-- 1 from businesses b where b.id::text = (storage.foldername(name))[1] ...)
-- es ambiguo — Postgres lo resuelve como businesses.name (la subquery tiene
-- prioridad de scope), no como storage.objects.name (la ruta del archivo
-- que se está subiendo). Como el nombre del comercio nunca matchea una ruta
-- de carpeta, el EXISTS siempre da false y la policy de INSERT/UPDATE
-- rechaza todas las subidas — por eso el panel de comercios no dejaba poner
-- imágenes. Se arregla calificando la columna como storage.objects.name.
drop policy if exists "business-logos: owner write" on storage.objects;
create policy "business-logos: owner write" on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1] and b.owner_user_id = auth.uid()
    )
  );

drop policy if exists "business-logos: owner update" on storage.objects;
create policy "business-logos: owner update" on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1] and b.owner_user_id = auth.uid()
    )
  );

drop policy if exists "benefit-images: owner write" on storage.objects;
create policy "benefit-images: owner write" on storage.objects for insert
  with check (
    bucket_id = 'benefit-images'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1] and b.owner_user_id = auth.uid()
    )
  );

drop policy if exists "benefit-images: owner update" on storage.objects;
create policy "benefit-images: owner update" on storage.objects for update
  using (
    bucket_id = 'benefit-images'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1] and b.owner_user_id = auth.uid()
    )
  );
