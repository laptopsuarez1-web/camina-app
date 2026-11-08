-- Portada del grupo (opcional): una foto ancha arriba del grupo. Afuera, en la lista de grupos, se ve difuminada;
-- adentro, nítida. Sin portada queda el tema de color del grupo (groups.background) con su dibujo.
-- La foto se sube al mismo bucket público de la foto del grupo (group-photos/<id del grupo>/portada.jpg): las
-- políticas de 0069 ya dejan subirla solo a quien creó el grupo, y la columna la cambia solo quien lo creó (0019).
alter table groups add column if not exists banner_url text;
alter table groups drop constraint if exists groups_banner_url_check;
alter table groups add constraint groups_banner_url_check
  check (banner_url is null or (length(banner_url) <= 600 and banner_url like 'https://%'));
