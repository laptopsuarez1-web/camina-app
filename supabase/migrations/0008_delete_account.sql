-- Varias foreign keys de 0001_init.sql no tenían "on delete" explícito
-- (default: NO ACTION), lo que bloqueaba borrar una cuenta apenas esa fila
-- tuviera cualquier referencia — necesario ahora que existe borrado real de
-- cuenta (ver supabase/functions/delete-account), requisito de Apple
-- (App Store Review Guideline 5.1.1(v)).

-- redemptions.confirmed_by: si el dueño de un comercio que confirmó códigos
-- borra su cuenta, el canje queda igual (con quién lo confirmó en null).
alter table redemptions drop constraint redemptions_confirmed_by_fkey;
alter table redemptions add constraint redemptions_confirmed_by_fkey
  foreign key (confirmed_by) references auth.users (id) on delete set null;

-- profiles.referred_by: si el referente borra su cuenta, el referido no se
-- borra ni pierde su perfil, solo se olvida quién lo invitó.
alter table profiles drop constraint profiles_referred_by_fkey;
alter table profiles add constraint profiles_referred_by_fkey
  foreign key (referred_by) references profiles (id) on delete set null;

-- groups.created_by: si quien creó un grupo borra su cuenta, el grupo (y sus
-- otros miembros) sigue existiendo, solo se pierde el dato de quién lo creó.
alter table groups drop constraint groups_created_by_fkey;
alter table groups add constraint groups_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

-- group_notes.user_id: not null (un mensaje sin autor no tiene sentido), así
-- que acá la única opción es borrar el mensaje junto con la cuenta.
alter table group_notes drop constraint group_notes_user_id_fkey;
alter table group_notes add constraint group_notes_user_id_fkey
  foreign key (user_id) references profiles (id) on delete cascade;

-- referrals: ambas columnas son not null: si cualquiera de las dos partes
-- borra su cuenta, el registro del referido deja de tener sentido.
alter table referrals drop constraint referrals_referrer_user_id_fkey;
alter table referrals add constraint referrals_referrer_user_id_fkey
  foreign key (referrer_user_id) references profiles (id) on delete cascade;
alter table referrals drop constraint referrals_referred_user_id_fkey;
alter table referrals add constraint referrals_referred_user_id_fkey
  foreign key (referred_user_id) references profiles (id) on delete cascade;
