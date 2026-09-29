-- Fecha de nacimiento (control de edad mínima: 13 años). Solo la ve el propio usuario.
alter table profiles add column if not exists birth_date date;
