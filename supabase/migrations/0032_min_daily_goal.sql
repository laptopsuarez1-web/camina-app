-- La meta diaria mínima es 1000 pasos: sube las que quedaron por debajo y lo exige la base de datos.
update profiles set daily_goal = 1000 where daily_goal < 1000;
alter table profiles drop constraint if exists profiles_daily_goal_min;
alter table profiles add constraint profiles_daily_goal_min check (daily_goal >= 1000);
