-- El equipo (admin) puede subir, reemplazar y borrar logo, portada, galería y fotos de premios de cualquier comercio
-- desde el panel Admin, sin entrar a su cuenta. Antes solo el dueño podía escribir en su carpeta.
-- Cómo se revierte: drop policy "business-logos: admin write" on storage.objects; (y las otras 5 con ese patrón).
drop policy if exists "business-logos: admin write" on storage.objects;
create policy "business-logos: admin write" on storage.objects for insert
  with check (bucket_id = 'business-logos' and is_admin());
drop policy if exists "business-logos: admin update" on storage.objects;
create policy "business-logos: admin update" on storage.objects for update
  using (bucket_id = 'business-logos' and is_admin());
drop policy if exists "business-logos: admin delete" on storage.objects;
create policy "business-logos: admin delete" on storage.objects for delete
  using (bucket_id = 'business-logos' and is_admin());

drop policy if exists "benefit-images: admin write" on storage.objects;
create policy "benefit-images: admin write" on storage.objects for insert
  with check (bucket_id = 'benefit-images' and is_admin());
drop policy if exists "benefit-images: admin update" on storage.objects;
create policy "benefit-images: admin update" on storage.objects for update
  using (bucket_id = 'benefit-images' and is_admin());
drop policy if exists "benefit-images: admin delete" on storage.objects;
create policy "benefit-images: admin delete" on storage.objects for delete
  using (bucket_id = 'benefit-images' and is_admin());
