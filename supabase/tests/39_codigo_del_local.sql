-- Canje con código del local (0065): código de 4 números, cerca del local, confirmado al instante.
begin;

do $$
declare
  u uuid; b uuid; biz uuid; code text; res jsonb; red redemptions; n integer; owner uuid;
begin
  -- ===== Camino feliz =====
  u := tt.mk_user(); b := tt.mk_benefit(10); perform tt.give(u, 25, 60);
  select business_id into biz from benefits where id = b;
  update businesses set lat = -17.7833, lng = -63.1821 where id = biz;
  select bc.code into code from business_local_codes bc where bc.business_id = biz;
  perform tt.t_true('cada local nace con un código de 4 números', code ~ '^[0-9]{4}$');

  perform tt.t_as(u);
  res := redeem_with_local_code(b, code, -17.7834, -63.1822);
  perform tt.t_eq('código correcto y cerca: ok', (res->>'ok')::boolean, true);
  perform tt.t_eq('queda confirmado al instante', res->'redemption'->>'status', 'confirmed');
  perform tt.t_eq('se anota que fue por código del local', res->'redemption'->>'confirmed_via', 'local_code');
  perform tt.t_eq('se descuentan los Puntos (25 - 10)', user_points_balance(u), 15 + 5);  -- +5 bono primera vez
  perform tt.t_eq('el bono de local nuevo también se da', (res->'redemption'->>'new_place_bonus')::int, 5);

  -- ===== Espera de 7 días: las reglas de siempre siguen =====
  perform tt.t_raises('no se puede repetir en el mismo local', format('select redeem_with_local_code(%L, %L, -17.7834, -63.1822)', b, code), 'menos de');

  -- ===== Lejos, sin ubicación, código mal =====
  u := tt.mk_user(); perform tt.give(u, 25, 60); perform tt.t_as(u);
  res := redeem_with_local_code(b, code, -17.80, -63.20);
  perform tt.t_eq('lejos del local: no canjea', res->>'reason', 'lejos');
  res := redeem_with_local_code(b, code, null, null);
  perform tt.t_eq('sin ubicación: no canjea', res->>'reason', 'sin_ubicacion');
  select count(*) into n from redemptions where user_id = u;
  perform tt.t_eq('los rechazos no dejan canjes', n, 0);

  res := redeem_with_local_code(b, '0000x', -17.7834, -63.1822);
  perform tt.t_eq('código incorrecto', res->>'reason', 'codigo_incorrecto');

  -- ===== El panel sigue andando y el dueño puede cambiar el código =====
  u := tt.mk_user(); perform tt.give(u, 25, 60); perform tt.t_as(u);
  red := redeem_benefit(b);
  owner := tt.mk_user();
  update businesses set owner_user_id = owner where id = biz;
  perform tt.t_as(owner);
  red := confirm_redemption_code(biz, red.code);
  perform tt.t_eq('el panel confirma como antes', red.status::text, 'confirmed');
  perform tt.t_eq('queda como confirmado por panel', red.confirmed_via, 'panel');
  perform tt.t_true('el dueño ve su código', exists (select 1 from business_local_codes where business_id = biz));
  perform tt.t_true('el dueño puede cambiarlo', reset_local_code(biz) ~ '^[0-9]{4}$');
  perform tt.as_client(u);
  perform tt.t_raises('otra persona no puede cambiarlo', format('select reset_local_code(%L)', biz), 'No autorizado');
  perform tt.t_eq('otra persona no ve códigos de locales', (select count(*) from business_local_codes)::int, 0);
  perform tt.as_admin();
end $$;

rollback;
