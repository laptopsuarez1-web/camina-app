-- Navidad (0087): temporada con fechas, probadores, Aguinaldo (día doble para todos) y Árbol del grupo.
begin;

do $$
declare
  a uuid; b uuid; c uuid; d uuid; outsider uuid; tester uuid; g uuid; today date := local_today();
  s jsonb; t jsonb; n integer;
begin
  a := tt.mk_user(5000); b := tt.mk_user(5000); c := tt.mk_user(5000); d := tt.mk_user(5000);
  outsider := tt.mk_user(); tester := tt.mk_user();
  insert into groups (name) values ('Grupo navideño') returning id into g;
  insert into group_members (group_id, user_id) values (g, a), (g, b), (g, c), (g, d), (g, tester);

  -- ===== Temporada fuera de fecha =====
  update app_seasons set starts_on = today + 10, ends_on = today + 40,
    config = jsonb_build_object('tree_from', today + 10, 'tree_to', today + 33, 'tree_goal', 18) where key = 'navidad';
  perform tt.t_as(a);
  perform tt.t_eq('antes de la fecha no hay temporada', season_now(), null::jsonb);
  perform tt.t_eq('antes de la fecha el árbol no aparece', group_tree(g), null::jsonb);

  -- ===== Probador: la ve antes =====
  perform tt.as_admin();
  insert into app_season_testers (user_id) values (tester);
  perform tt.t_as(tester);
  s := season_now();
  perform tt.t_eq('el probador ve la temporada', s->>'key', 'navidad');
  perform tt.t_eq('y sabe que es vista previa', (s->>'preview')::boolean, true);
  perform tt.t_true('el probador ve el árbol de su grupo', group_tree(g) is not null);
  perform tt.t_as(a);
  perform tt.t_eq('los demás todavía no la ven', season_now(), null::jsonb);

  -- ===== Temporada en curso =====
  perform tt.as_admin();
  update app_seasons set starts_on = today - 5, ends_on = today + 20,
    config = jsonb_build_object('tree_from', today - 5, 'tree_to', today + 2, 'tree_goal', 3) where key = 'navidad';
  perform tt.t_as(a);
  s := season_now();
  perform tt.t_eq('en fecha todos la ven', s->>'key', 'navidad');
  perform tt.t_eq('ya no es vista previa', (s->>'preview')::boolean, false);
  perform tt.t_as(a);

  -- ===== Árbol: 5 personas, hace falta la mitad (3) cada día =====
  -- día -5: 3 cumplen (luz); día -4: 2 cumplen (no); día -3: 4 cumplen (luz); día -1: 3 cumplen pero uno con su meta propia más alta (no).
  perform tt.seed_steps(a, today - 5, 6000); perform tt.seed_steps(b, today - 5, 5500); perform tt.seed_steps(c, today - 5, 5000);
  perform tt.seed_steps(a, today - 4, 6000); perform tt.seed_steps(b, today - 4, 9000); perform tt.seed_steps(c, today - 4, 100);
  perform tt.seed_steps(a, today - 3, 6000); perform tt.seed_steps(b, today - 3, 6000); perform tt.seed_steps(c, today - 3, 6000); perform tt.seed_steps(d, today - 3, 6000);
  perform tt.seed_steps(a, today - 1, 6000); perform tt.seed_steps(b, today - 1, 6000); perform tt.seed_steps(c, today - 1, 6000, 1200, 8000);
  perform tt.seed_steps(a, today, 7000); perform tt.seed_steps(d, today, 7000);
  t := group_tree(g);
  perform tt.t_eq('24 luces → aquí 8 días (de -5 a +2)', (t->>'lights')::int, 8);
  perform tt.t_eq('hace falta la mitad del grupo (3 de 5)', (t->>'need')::int, 3);
  perform tt.t_eq('se encendieron 2 luces', (t->>'lit')::int, 2);
  perform tt.t_eq('la meta propia de ese día manda (8.000 no se cumple con 6.000)', (t->'days'->4->>'lit')::boolean, false);
  perform tt.t_eq('hoy van 2 de 3', (t->'today'->>'met')::int, 2);
  perform tt.t_eq('la luz de hoy todavía no', (t->'today'->>'lit')::boolean, false);
  perform tt.t_true('se sabe quién ya cumplió hoy', (t->'today'->'met_ids') ? a::text and (t->'today'->'met_ids') ? d::text);
  perform tt.t_eq('los días que vienen quedan apagados', (t->'days'->7->>'lit')::boolean, false);
  perform tt.t_eq('todavía no está completo', (t->>'complete')::boolean, false);
  perform tt.seed_steps(b, today, 5000);
  t := group_tree(g);
  perform tt.t_eq('con la tercera persona se enciende la luz de hoy', (t->'today'->>'lit')::boolean, true);
  perform tt.t_eq('3 luces = árbol encendido (meta 3)', (t->>'complete')::boolean, true);

  perform tt.t_as(outsider);
  perform tt.t_eq('quien no es del grupo no ve el árbol', group_tree(g), null::jsonb);
  perform tt.t_as(a);
  select jsonb_array_length(my_group_trees()) into n;
  perform tt.t_eq('mis grupos traen su árbol', n, 1);

  -- Un grupo nuevo en plena temporada también tiene su árbol (con los pasos de sus miembros).
  insert into groups (name) values ('Grupo de diciembre') returning id into g;
  insert into group_members (group_id, user_id) values (g, a), (g, b);
  t := group_tree(g);
  perform tt.t_eq('grupo nuevo: con 2 personas basta 1 por día', (t->>'need')::int, 1);
  perform tt.t_true('grupo nuevo: ya tiene luces de los días pasados', (t->>'lit')::int >= 4);

  -- ===== Aguinaldo: día doble para todos =====
  perform tt.as_admin();
  insert into global_double_days (day, label) values (today, 'Prueba') on conflict (day) do update set label = 'Prueba';
  perform tt.t_eq('el día doble global vale para cualquiera', is_double_day(outsider, today), true);
  perform tt.t_eq('otro día no', is_double_day(outsider, today - 1), false);
  perform tt.t_as(a);
  s := season_now();
  perform tt.t_eq('la app sabe que hoy es día doble', (s->'double_day'->>'today')::boolean, true);
  -- 12.000 pasos en el Aguinaldo: 24 Puntos (1 cada 500), no 12.
  perform tt.seed_steps(outsider, today, 12000, 1200);
  perform tt.t_as(outsider);
  perform earn_points_from_steps(outsider, today, 12000);
  perform tt.t_eq('en el Aguinaldo 12.000 pasos dan 24 Puntos', (select coalesce(sum(amount), 0)::int from points_ledger where user_id = outsider and reason = 'steps' and ref_day = today), 24);

  -- ===== Permisos =====
  perform tt.t_eq('sin sesión no se puede pedir la temporada', has_function_privilege('anon', 'season_now()', 'execute'), false);
  perform tt.t_eq('sin sesión no se ve el árbol', has_function_privilege('anon', 'group_tree(uuid)', 'execute'), false);
  perform tt.t_eq('nadie con cuenta llama a is_double_day directo', has_function_privilege('authenticated', 'is_double_day(uuid, date)', 'execute'), false);
end $$;

rollback;
