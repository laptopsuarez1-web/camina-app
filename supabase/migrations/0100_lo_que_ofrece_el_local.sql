-- "Lo que ofrece" el local (opcional): palabras que el comercio elige en el panel (batidos, jugos, nutricionista…)
-- o escribe si no están en la lista. La app las usa en el buscador de Canjes y del mapa.
-- Hasta 12 palabras de hasta 30 letras cada una. Pasan por el mismo filtro de malas palabras que el nombre.
alter table businesses add column if not exists keywords text[] not null default '{}';
alter table businesses drop constraint if exists businesses_keywords_check;
alter table businesses add constraint businesses_keywords_check
  check (cardinality(keywords) <= 12 and length(array_to_string(keywords, '')) <= 12 * 30);

-- Filtro de malas palabras (0092) también para lo que el local escribe en "Otra" (categoría y palabras).
drop trigger if exists filtro_comercio_palabras on businesses;
create trigger filtro_comercio_palabras before insert or update of keywords, category on businesses
  for each row execute function _sin_malas_palabras('keywords', 'category');
