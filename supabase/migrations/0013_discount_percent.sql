-- discount_detail era 100% texto libre — si un comercio ponía "20" ahí, se
-- mostraba tal cual "20" en la app, sin sentido. Se agrega un campo numérico
-- real para el caso común (porcentaje), dejando discount_detail para casos
-- que no son un simple porcentaje (2x1, "Bs 10 de descuento", etc.).
alter table benefits add column discount_percent numeric(5,2);
alter table benefits add constraint benefits_discount_percent_range
  check (discount_percent is null or (discount_percent > 0 and discount_percent <= 100));
