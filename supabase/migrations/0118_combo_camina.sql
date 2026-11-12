-- Combo Camina: un combo armado por el local a precio especial para quien canjea (va como un descuento).
-- combo_items: qué trae («Salchipapa clásica + gaseosa personal»); combo_price_bs: precio con Camina; combo_regular_bs: precio normal.
-- Cómo se revierte: alter table benefits drop constraint benefits_combo_check, drop column combo_items,
--   drop column combo_price_bs, drop column combo_regular_bs;

alter table public.benefits add column if not exists combo_items text;
alter table public.benefits add column if not exists combo_price_bs numeric(10,2);
alter table public.benefits add column if not exists combo_regular_bs numeric(10,2);

alter table public.benefits drop constraint if exists benefits_combo_check;
alter table public.benefits add constraint benefits_combo_check check (
  (combo_items is null and combo_price_bs is null and combo_regular_bs is null)
  or (
    type = 'descuento'
    and char_length(btrim(combo_items)) between 3 and 120
    and combo_price_bs > 0 and combo_regular_bs > combo_price_bs and combo_regular_bs < 100000
  )
);
