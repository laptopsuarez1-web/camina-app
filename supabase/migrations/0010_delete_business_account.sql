-- Igual que 0008_delete_account.sql pero del lado comercio: redemptions
-- referenciaba benefit_id/business_id sin "on delete" explícito (NO ACTION),
-- lo que bloqueaba borrar un negocio apenas tuviera algún canje en su
-- historial. Al borrar un negocio, su historial de canjes deja de tener
-- sentido — se borra en cascada (el balance de Puntos del usuario no se ve
-- afectado: points_ledger no depende de redemptions).
alter table redemptions drop constraint redemptions_business_id_fkey;
alter table redemptions add constraint redemptions_business_id_fkey
  foreign key (business_id) references businesses (id) on delete cascade;

alter table redemptions drop constraint redemptions_benefit_id_fkey;
alter table redemptions add constraint redemptions_benefit_id_fkey
  foreign key (benefit_id) references benefits (id) on delete cascade;
