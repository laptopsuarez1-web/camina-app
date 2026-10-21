-- 0063: meta por defecto de 5.000 y pasos del día que no bajan con una sincronización menor.
begin;

do $$
declare
  u uuid; today date := local_today();
begin
  insert into auth.users (id, email) values (gen_random_uuid(), 'meta5000@test.local') returning id into u;
  insert into profiles (id, full_name) values (u, 'Meta') on conflict (id) do nothing;
  perform tt.t_eq('cuenta nueva: meta de 5.000', (select daily_goal from profiles where id = u), 5000);

  u := tt.mk_user(); perform tt.t_as(u); perform tt.seed_steps(u, today, 0);
  perform earn_points_from_steps(u, today, 4200);
  perform earn_points_from_steps(u, today, 1300);
  perform tt.t_eq('una sincronización menor no baja los pasos', (select steps from steps_daily where user_id = u and day = today), 4200);
  perform tt.t_eq('... ni los Puntos', tt.steps_pts(u, today), 4);
  perform earn_points_from_steps(u, today, 5100);
  perform tt.t_eq('una mayor sí suma', tt.steps_pts(u, today), 5);
end $$;

rollback;
