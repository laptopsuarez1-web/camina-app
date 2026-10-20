-- Desafíos, eventos y publicidad (0061): paquetes, meta por día o total desde que se anotan, conteos y avance.
begin;

do $$
declare
  admin_id uuid; ow_pub uuid; ow_loc uuid; b_pub uuid; b_loc uuid; u1 uuid; u2 uuid; u3 uuid;
  p promotions; pid uuid; win integer; prog record; d date := (now() at time zone 'America/La_Paz')::date;
begin
  perform tt.as_admin();
  admin_id := tt.mk_user(); ow_pub := tt.mk_user(); ow_loc := tt.mk_user(); u1 := tt.mk_user(6000, 'Uno'); u2 := tt.mk_user(6000, 'Dos'); u3 := tt.mk_user(6000, 'Tres');
  insert into businesses (name, category, plan, approved, owner_user_id, account_kind)
    values ('Solo publicidad', 'Otros', 'paso_firme', true, ow_pub, 'events_only') returning id into b_pub;
  insert into businesses (name, category, plan, approved, owner_user_id, account_kind)
    values ('Con local', 'Otros', 'paso_firme', true, ow_loc, 'commerce') returning id into b_loc;

  update businesses set approved = true where id in (b_pub, b_loc);

  -- Paquetes
  perform tt.t_as(ow_loc);
  perform tt.t_raises('local: no puede pedir publicidad', format('select request_promotion_v2(%L,''publicidad'',''Hola'',''Descripcion'',null,now()+interval ''1 day'',now()+interval ''5 days'',null,null,null,1,''violeta'',null,null)', b_loc), 'paquete de solo publicidad');
  p := request_promotion_v2(b_loc, 'desafio', 'Desafío Salchipapa', 'Sorteamos salchipapas', '3 salchipapas', now() + interval '1 hour', now() + interval '4 days', 'daily', 8000, 3, 3, 'menta', null, null);
  perform tt.t_eq('local: desafío cuesta Bs 200', p.price_bs, 200);
  perform tt.t_eq('desafío: queda pendiente', p.status, 'pending');
  perform tt.t_raises('desafío sin meta se rechaza', format('select request_promotion_v2(%L,''desafio'',''Sin meta'',''Descripcion'',null,now()+interval ''1 day'',now()+interval ''3 days'',null,null,null,1,''violeta'',null,null)', b_loc), 'meta');
  perform tt.t_raises('evento con meta se rechaza', format('select request_promotion_v2(%L,''evento'',''Evento'',''Descripcion'',null,now()+interval ''1 day'',now()+interval ''3 days'',''total'',5000,null,1,''violeta'',null,null)', b_loc), 'Solo los desafíos');
  perform tt.t_raises('evento: máximo 14 días', format('select request_promotion_v2(%L,''evento'',''Evento'',''Descripcion'',null,now()+interval ''1 day'',now()+interval ''20 days'',null,null,null,1,''violeta'',null,null)', b_loc), 'vigencia máxima');
  perform tt.t_raises('foto de fondo debe ser https', format('select request_promotion_v2(%L,''evento'',''Evento'',''Descripcion'',null,now()+interval ''1 day'',now()+interval ''3 days'',null,null,null,1,null,''javascript:x'',null)', b_loc), 'foto de fondo');

  perform tt.t_as(ow_pub);
  p := request_promotion_v2(b_pub, 'publicidad', 'Banner', 'Mi tienda online', null, now() + interval '1 hour', now() + interval '20 days', null, null, null, 1, 'dorado', null, 'https://ejemplo.com');
  perform tt.t_eq('solo publicidad: cuesta Bs 400', p.price_bs, 400);

  -- Aprobar y participar
  perform tt.as_admin();
  select id into pid from promotions where business_id = b_loc and kind = 'desafio';
  update promotions set starts_at = now() - interval '5 days', ends_at = now() + interval '1 hour', status = 'approved' where id = pid;
  select id into p.id from promotions where business_id = b_pub;
  update promotions set status = 'approved', starts_at = now() - interval '1 hour' where business_id = b_pub;

  perform tt.t_as(u1);
  perform tt.t_raises('publicidad no se participa', format('select join_promotion(%L)', p.id), 'no está vigente');
  perform tt.t_as(u1); perform join_promotion(pid);
  perform tt.t_as(u2); perform join_promotion(pid);
  perform tt.t_as(u3);
  perform tt.t_eq('conteo de participantes', (select participants from promotion_counts() where promotion_id = pid), 2);

  -- Un evento se puede anotar antes de empezar; un desafío que no empezó, no.
  perform tt.as_admin();
  insert into promotions (business_id, kind, title, description, starts_at, ends_at, price_bs, status)
    values (b_loc, 'evento', 'Evento futuro', 'Descripcion', now() + interval '2 days', now() + interval '2 days 3 hours', 200, 'approved');
  insert into promotions (business_id, kind, title, description, starts_at, ends_at, price_bs, status, goal_mode, goal_steps, goal_days)
    values (b_loc, 'desafio', 'Desafío futuro', 'Descripcion', now() + interval '2 days', now() + interval '4 days', 200, 'approved', 'total', 5000, null);
  perform tt.t_as(u3);
  perform join_promotion((select id from promotions where title = 'Evento futuro'));
  perform tt.t_raises('desafío que no empezó: no se puede participar', format('select join_promotion(%L)', (select id from promotions where title = 'Desafío futuro')), 'no está vigente');

  -- Pasos: u1 cumple 3 días de 8000 desde que se anotó; u2 tiene días de antes de anotarse (no cuentan).
  perform tt.as_admin();
  update promotion_entries set joined_at = now() - interval '3 days' where promotion_id = pid and user_id = u1;
  insert into steps_daily (user_id, day, steps) values
    (u1, d, 9000), (u1, d - 1, 8500), (u1, d - 2, 8200),
    (u2, d - 4, 9000), (u2, d - 3, 9000), (u2, d - 2, 9000), (u2, d, 1000)
  on conflict (user_id, day) do update set steps = excluded.steps;
  perform tt.t_true('cumple: 3 días con 8000+ desde que se anotó', _promotion_eligible((select promotions from promotions where id = pid), u1));
  perform tt.t_true('no cumple: los días de antes de anotarse no cuentan', not _promotion_eligible((select promotions from promotions where id = pid), u2));

  perform tt.t_as(u1);
  select * into prog from my_promotion_progress(pid);
  perform tt.t_eq('avance: días cumplidos', prog.days_met, 3);
  perform tt.t_eq('avance: pasos desde que me anoté', prog.steps_total, 25700);

  -- Meta en total
  perform tt.as_admin();

  update promotions set goal_mode = 'total', goal_steps = 25000, goal_days = null where id = pid;
  perform tt.t_true('total: suma desde que se anotó', _promotion_eligible((select promotions from promotions where id = pid), u1));
  update promotions set goal_steps = 30000 where id = pid;
  perform tt.t_true('total: no alcanza', not _promotion_eligible((select promotions from promotions where id = pid), u1));

  -- Sorteo: solo entre quien cumple
  perform tt.as_admin();
  update promotions set goal_steps = 25000 where id = pid;
  update promotions set ends_at = now() - interval '1 minute' where id = pid;
  insert into app_admins (user_id) values (admin_id) on conflict do nothing;
  perform tt.t_as(admin_id);
  select count(*) into win from draw_promotion(pid);
  perform tt.t_eq('sorteo: solo gana quien cumplió', win, 1);
end $$;

rollback;
