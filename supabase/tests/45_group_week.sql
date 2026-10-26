-- Cierre semanal de grupos (0028): close_group_week(p_week_start) arma el ranking de la semana (lunes a domingo).
begin;

do $$
declare
  g uuid; a uuid; b uuid; c uuid; d uuid; wk date := date_trunc('week', local_today())::date - 14;   -- una semana ya cerrada
  r record; n integer; msg text;
begin
  insert into groups (name, created_by) values ('Caminantes de prueba', null) returning id into g;
  a := tt.mk_user(3000, 'Ana'); b := tt.mk_user(3000, 'Beto'); c := tt.mk_user(3000, 'Carla'); d := tt.mk_user(3000, 'Dani');
  insert into group_members (group_id, user_id, joined_at) values
    (g, a, now() - interval '60 days'), (g, b, now() - interval '60 days'), (g, c, now() - interval '60 days');
  insert into group_members (group_id, user_id, joined_at) values (g, d, now());          -- entró después de esa semana

  -- Ana: 4 días de 5.000 (meta 3.000 cumplida los 4) = 20.000; Beto: 2 días de 6.000 + 1 de 1.000; Carla: sin pasos.
  perform tt.seed_steps(a, wk, 5000, 1200, 3000);     perform tt.seed_steps(a, wk + 1, 5000, 1200, 3000);
  perform tt.seed_steps(a, wk + 2, 5000, 1200, 3000); perform tt.seed_steps(a, wk + 3, 5000, 1200, 3000);
  perform tt.seed_steps(b, wk, 6000, 1200, 3000);     perform tt.seed_steps(b, wk + 1, 6000, 1200, 3000);
  perform tt.seed_steps(b, wk + 2, 1000, 1200, 3000);
  -- Pasos fuera de la semana: el domingo anterior y el lunes siguiente no cuentan.
  perform tt.seed_steps(c, wk - 1, 9000, 1200, 3000); perform tt.seed_steps(c, wk + 7, 9000, 1200, 3000);

  n := close_group_week(wk);
  perform tt.t_eq('se guardan tres filas (los tres que ya eran miembros)', n, 3);
  select * into r from group_weekly_results where group_id = g and user_id = a;
  perform tt.t_eq('Ana: 20.000 pasos', r.steps, 20000);
  perform tt.t_eq('Ana: puesto 1', r.rank, 1);
  perform tt.t_eq('Ana: 4 días con meta', r.goal_days, 4);
  select * into r from group_weekly_results where group_id = g and user_id = b;
  perform tt.t_eq('Beto: 13.000 pasos', r.steps, 13000);
  perform tt.t_eq('Beto: puesto 2', r.rank, 2);
  perform tt.t_eq('Beto: 2 días con meta (6.000 y 6.000; 1.000 no llega)', r.goal_days, 2);
  select * into r from group_weekly_results where group_id = g and user_id = c;
  perform tt.t_eq('Carla: los pasos de fuera de la semana no suman', r.steps, 0);
  perform tt.t_eq('Carla: puesto 3', r.rank, 3);
  select count(*) into n from group_weekly_results where group_id = g and user_id = d;
  perform tt.t_eq('quien entró al grupo después de esa semana no figura', n, 0);

  -- Avisos: solo a quienes caminaron; el ganador recibe un mensaje distinto.
  select body into msg from notifications_outbox where user_id = a and data->>'type' = 'group_week';
  perform tt.t_true('la ganadora recibe "Ganaste la semana con 20000 pasos"', msg = '¡Ganaste la semana con 20000 pasos!');
  select body into msg from notifications_outbox where user_id = b and data->>'type' = 'group_week';
  perform tt.t_true('el segundo recibe puesto y nombre de quien ganó', msg = 'Quedaste #2 con 13000 pasos. Ganó Ana.');
  select count(*) into n from notifications_outbox where user_id = c and data->>'type' = 'group_week';
  perform tt.t_eq('quien no caminó no recibe aviso', n, 0);

  -- Idempotente: correrlo de nuevo no duplica filas ni avisos.
  n := close_group_week(wk);
  perform tt.t_eq('segunda corrida: no inserta nada', n, 0);
  select count(*) into n from notifications_outbox where data->>'type' = 'group_week';
  perform tt.t_eq('segunda corrida: no duplica avisos', n, 2);

  -- Empate: mismos pasos y mismos días => mismo puesto (rank), no se saltea arbitrariamente.
  wk := wk - 28;                                            -- una semana limpia, sin pasos de Carla
  perform tt.seed_steps(a, wk, 4000, 1200, 3000); perform tt.seed_steps(b, wk, 4000, 1200, 3000);
  perform close_group_week(wk);
  select count(*) into n from group_weekly_results where group_id = g and week_start = wk and rank = 1;
  perform tt.t_eq('empate total: los dos quedan en el puesto 1', n, 2);

  -- Desempate: mismos pasos, pero uno cumplió la meta más días => ese queda primero.
  wk := wk - 7;
  perform tt.seed_steps(b, wk, 2000, 1200, 1000); perform tt.seed_steps(b, wk + 1, 2000, 1200, 1000);   -- b: 4.000 en 2 días, ambos >= meta 3.000? no: 2.000 < 3.000
  perform tt.seed_steps(a, wk, 4000, 1200, 3000);                                                       -- a: 4.000 en 1 día, cumple 3.000
  perform close_group_week(wk);
  select rank into n from group_weekly_results where group_id = g and week_start = wk and user_id = a;
  perform tt.t_eq('mismos pasos: quien cumplió más días con la meta queda primero (a)', n, 1);
  select rank into n from group_weekly_results where group_id = g and week_start = wk and user_id = b;
  perform tt.t_eq('mismos pasos: el que cumplió menos días queda segundo (b)', n, 2);

  -- BUG: los días con meta se miden con la meta ACTUAL del perfil (p.daily_goal), no con la que tenía cada día (steps_daily.goal, 0039).
  wk := wk - 7;
  perform tt.seed_steps(a, wk, 4000, 1200, 3000);          -- ese día la meta era 3.000 y la cumplió
  update profiles set daily_goal = 6000 where id = a;       -- después subió la meta
  perform close_group_week(wk);
  select goal_days into n from group_weekly_results where group_id = g and week_start = wk and user_id = a;
  perform tt.t_xfail_eq('cumplió su meta de ese día (4.000 >= 3.000) aunque hoy su meta sea 6.000: debería contar 1 día', n, 1);

  -- weekly_group_maintenance cierra la semana anterior y ya NO vacía los chats (duran 90 días, 0066).
  insert into group_notes (group_id, user_id, text) values (g, a, 'hola');
  perform weekly_group_maintenance();
  select count(*) into n from group_notes;
  perform tt.t_eq('el mantenimiento semanal no borra los chats de grupo', n, 1);

  -- Tamaño máximo del grupo: 50 personas.
  insert into groups (name) values ('Grupo lleno') returning id into g;
  for n in 1..50 loop insert into group_members (group_id, user_id) values (g, tt.mk_user()); end loop;
  perform tt.t_raises('el grupo 51 no entra', format('insert into group_members (group_id, user_id) values (%L, %L)', g, tt.mk_user()), 'máximo de 50 personas');
end $$;

rollback;
