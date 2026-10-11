-- Más fotos del local (galería en la ficha de la app) y descripción del producto/beneficio.
alter table businesses add column if not exists photos text[] not null default '{}';
alter table benefits add column if not exists description text;
