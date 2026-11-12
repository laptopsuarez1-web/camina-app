-- 0116: premio "con tu compra". El local puede pedir que la persona compre algo para llevarse el premio
-- ("Con tu corte, lavado gratis"). Así el comercio suma una venta con cada canje y puede poner premios más baratos en Puntos.
-- Solo agrega una columna opcional: los premios existentes siguen igual (null = no hace falta comprar nada).
alter table benefits add column if not exists with_purchase text;
alter table benefits drop constraint if exists benefits_with_purchase_len;
alter table benefits add constraint benefits_with_purchase_len check (with_purchase is null or char_length(btrim(with_purchase)) between 3 and 60);
comment on column benefits.with_purchase is 'Premio con tu compra: qué tiene que comprar la persona para llevarse el premio (ej: "un corte de cabello"). Null = no hace falta comprar nada.';
