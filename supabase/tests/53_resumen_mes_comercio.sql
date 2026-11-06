-- Resumen del mes del comercio (0090).
begin;

do $$
declare
  u uuid; u2 uuid; owner uuid; otro uuid; b uuid; biz uuid; red redemptions; res jsonb; m date;
begin
  u := tt.mk_user(); u2 := tt.mk_user(); b := tt.mk_benefit(1, 50); perform tt.give(u, 500, 60); perform tt.give(u2, 500, 60);
  select business_id into biz from benefits where id = b;
  owner := tt.mk_user(); otro := tt.mk_user();
  update businesses set owner_user_id = owner where id = biz;
  m := route_month();

  -- u ya vino el mes pasado (canje viejo); u2 viene por primera vez este mes por la Ruta.
  insert into redemptions (user_id, benefit_id, business_id, cost_points, code, code_expires_at, status, confirmed_at, created_at, extra_consumption)
    values (u, b, biz, 1, 'OLD1', now(), 'confirmed', (m - interval '10 days'), (m - interval '10 days'), false);
  perform tt.t_as(u); red := redeem_benefit(b);
  perform tt.t_as(owner); red := confirm_redemption_code(biz, red.code);
  perform tt.as_admin();
  update redemptions set extra_consumption = true where id = red.id;
  insert into route_participants (user_id, month) values (u2, m);
  insert into route_stops (user_id, month, business_id) values (u2, m, biz);
  insert into route_visits (user_id, month, business_id, status, decided_at) values (u2, m, biz, 'confirmed', now());

  perform tt.as_client(otro);
  perform tt.t_raises('otra persona no ve el resumen', format('select business_month_summary(%L)', biz), 'No autorizado');
  perform tt.as_client(owner);
  res := business_month_summary(biz);
  perform tt.t_eq('canjes del mes', (res->>'canjes')::int, 1);
  perform tt.t_eq('canjes del mes pasado', (res->>'canjes_prev')::int, 1);
  perform tt.t_eq('visitas de la Ruta', (res->>'ruta')::int, 1);
  perform tt.t_eq('personas distintas', (res->>'personas')::int, 2);
  perform tt.t_eq('nuevos (u2)', (res->>'nuevos')::int, 1);
  perform tt.t_eq('volvieron (u)', (res->>'volvieron')::int, 1);
  perform tt.t_eq('compraron algo más', (res->>'compraron_extra')::int, 1);
  perform tt.t_eq('está en la ruta de 1 persona', (res->>'en_rutas')::int, 1);
  perform tt.t_true('tiene mejor día', (res->>'mejor_dia') is not null);
end $$;

rollback;
