-- Fotos reales de comercio: hasta ahora logo_url existía en la tabla pero el
-- panel no tenía forma de subirlo (el logo de Bloom estaba hardcodeado en el
-- código de la app — ver constants/business-assets.ts). Se agrega portada de
-- comercio y foto por beneficio.

alter table businesses add column cover_url text;
alter table benefits add column image_url text;

-- La portada usa el mismo bucket/carpeta que el logo (business-logos/<business_id>/...,
-- ya tiene policies de owner write/update); acá solo hace falta el bucket nuevo
-- para la foto de cada beneficio.
insert into storage.buckets (id, name, public)
values ('benefit-images', 'benefit-images', true)
on conflict (id) do nothing;

create policy "benefit-images: public read" on storage.objects for select
  using (bucket_id = 'benefit-images');
create policy "benefit-images: owner write" on storage.objects for insert
  with check (
    bucket_id = 'benefit-images'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid()
    )
  );
create policy "benefit-images: owner update" on storage.objects for update
  using (
    bucket_id = 'benefit-images'
    and exists (
      select 1 from businesses b
      where b.id::text = (storage.foldername(name))[1] and b.owner_user_id = auth.uid()
    )
  );
