-- Place ID de Google de cada local: con él, "Calificar en Google Maps" abre directo la pantalla de escribir la reseña
-- (https://search.google.com/local/writereview?placeid=...). Se llena con supabase/scripts/fill-place-ids.mjs; sin él, la app abre la ficha del local.
alter table businesses add column if not exists google_place_id text;
