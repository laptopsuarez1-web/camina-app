-- Pantalla "elegí tu plan" al crear la cuenta: se muestra una sola vez por comercio nuevo.
alter table businesses add column if not exists plan_onboarded boolean not null default false;
-- Los comercios que ya existen no la vuelven a ver.
update businesses set plan_onboarded = true;
