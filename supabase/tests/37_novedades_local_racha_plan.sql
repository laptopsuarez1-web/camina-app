-- Bono por local nuevo, racha semanal y plan gratis (0058).
begin;

do $$
declare
  u uuid; owner uuid; b uuid; bz uuid; red redemptions; r2 redemptions; bf uuid; today date := local_today();
  i integer; pts integer; n integer; bid uuid; g uuid;
begin
  -- ===== Local nuevo =====
  owner := tt.mk_user(); u := tt.mk_user(6000, 'Ana'); b := tt.mk_benefit(10, 99);
  perform tt.give(u, 200, 60);
  select business_id into bz from benefits where id = b;
  update businesses set owner_user_id = owner where id = bz;

  perform tt.t_as(u);
  perform tt.t_eq('antes de canjear, la ficha ofrece +5', my_new_place_bonus(bz), 5);
  red := redeem_benefit(b);
  perform tt.t_eq('el canje pendiente no da el bono', user_points_balance(u), 200);
  perform tt.t_as(owner); r2 := confirm_redemption_code(bz, red.code);
  perform tt.t_as(u);
  perform tt.t_eq('primer canje en un local de pago: -10 +5', user_points_balance(u), 195);
  perform tt.t_eq('el canje guarda el bono', r2.new_place_bonus, 5);
  perform tt.t_eq('ya no ofrece el bono en ese local', my_new_place_bonus(bz), 0);
  update redemptions set created_at = created_at - interval '8 days' where user_id = u;
  red := redeem_benefit(b);
  perform tt.t_as(owner); r2 := confirm_redemption_code(bz, red.code);
  perform tt.t_as(u);
  perform tt.t_eq('segundo canje en el mismo local: sin bono', user_points_balance(u), 185);
  perform tt.t_eq('el segundo canje no guarda bono', r2.new_place_bonus, 0);

end $$;

do $$
declare
  u uuid; owner uuid; bid uuid; g uuid; bf uuid; red redemptions;
begin
  perform tt.as_admin();
  owner := tt.mk_user(); u := tt.mk_user(6000, 'Beto');
  perform tt.give(u, 100, 60);
  insert into businesses (name, category, plan, approved, owner_user_id) values ('Local gratis', 'Café', 'primer_paso', true, owner) returning id into bid;
  insert into benefits (business_id, name, type, cost_points, daily_quota) values (bid, 'Gratis', 'gratis', 10, 5) returning id into g;
  perform tt.t_as(u);
  perform tt.t_eq('en plan gratis la ficha no ofrece bono', my_new_place_bonus(bid), 0);
  red := redeem_benefit(g);
  perform tt.t_as(owner); perform confirm_redemption_code(bid, red.code);
  perform tt.t_as(u);
  perform tt.t_eq('plan gratis: solo se descuentan los 10', user_points_balance(u), 90);
end $$;

do $$
declare
  u uuid; today date := local_today(); r record; pts integer; i integer;
begin
  -- ===== Racha semanal =====
  perform tt.as_admin();
  u := tt.mk_user(3000, 'Racha');
  for i in 1..7 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  perform tt.t_as(u);
  select * into r from my_streak_state();
  perform tt.t_eq('7 días cumplidos (hoy aún no): racha 7', r.streak, 7);
  perform tt.t_eq('un bloque completo', r.blocks_done, 1);
  perform tt.t_eq('sin cobrar', r.blocks_claimed, 0);
  pts := claim_streak_bonus();
  perform tt.t_eq('cobra +5', pts, 5);
  perform tt.t_eq('los Puntos entran al saldo', user_points_balance(u), 5);
  perform tt.t_eq('cobrar de nuevo no duplica', claim_streak_bonus(), 0);
  perform tt.t_eq('saldo igual', user_points_balance(u), 5);
  perform tt.seed_steps(u, today, 5000);
  perform tt.t_eq('día 8: todavía un solo bloque', (select blocks_done from my_streak_state()), 1);
  perform tt.t_eq('día 8: sin nada nuevo que cobrar', claim_streak_bonus(), 0);
  -- racha de 14 días con el primer bloque ya cobrado: solo cobra el segundo
  u := tt.mk_user(3000, 'Doble'); perform tt.t_as(u);
  for i in 1..14 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  insert into streak_claims (user_id, block_start, block_end, points) values (u, today - 14, today - 8, 5);
  perform tt.t_eq('14 días, 1 bloque cobrado: queda 1 por cobrar', (select blocks_done - blocks_claimed from my_streak_state()), 1);
  perform tt.t_eq('cobra solo el segundo bloque', claim_streak_bonus(), 5);
  perform tt.t_eq('y no vuelve a cobrar', claim_streak_bonus(), 0);

  -- racha cortada: no hay bloques
  u := tt.mk_user(3000, 'Cortada'); perform tt.t_as(u);
  for i in 1..5 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  perform tt.t_eq('5 días: no cobra', claim_streak_bonus(), 0);

  -- meta baja (3.000): la racha se ve, pero el bono exige 5.000 pasos cada día
  u := tt.mk_user(3000, 'MetaBaja'); perform tt.t_as(u);
  for i in 1..7 loop perform tt.seed_steps(u, today - i, 3500); end loop;
  select * into r from my_streak_state();
  perform tt.t_eq('meta baja: la racha se muestra (7)', r.streak, 7);
  perform tt.t_eq('meta baja: sin bloque con bono', r.blocks_done, 0);
  perform tt.t_eq('meta baja con 3.500: no cobra', claim_streak_bonus(), 0);
  perform tt.seed_steps(u, today - 4, 5000);
  perform tt.t_eq('un solo día de 5.000 no completa el bloque', claim_streak_bonus(), 0);
  for i in 1..7 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  perform tt.t_eq('7 días de 5.000: cobra +5', claim_streak_bonus(), 5);
  -- meta alta (8.000): con 5.000 no cuenta ni la racha
  u := tt.mk_user(8000, 'MetaAlta'); perform tt.t_as(u);
  for i in 1..7 loop perform tt.seed_steps(u, today - i, 5000); end loop;
  perform tt.t_eq('meta 8.000 con 5.000: sin racha', (select streak from my_streak_state()), 0);
  perform tt.t_eq('meta 8.000 con 5.000: no cobra', claim_streak_bonus(), 0);
end $$;

do $$
declare
  owner uuid; bid uuid; g uuid; d uuid;
begin
  -- ===== Plan gratis: 1 gratis primero, después 1 descuento =====
  perform tt.as_admin();
  owner := tt.mk_user();
  insert into businesses (name, category, plan, approved, owner_user_id) values ('Local P1', 'Café', 'primer_paso', true, owner) returning id into bid;
  perform tt.t_raises('un descuento sin gratis no se puede crear',
    format($q$insert into benefits (business_id, name, type, cost_points, daily_quota) values (%L, 'Desc', 'descuento', 10, 5)$q$, bid), 'Primero creá un premio gratis');
  insert into benefits (business_id, name, type, cost_points, daily_quota) values (bid, 'Gratis', 'gratis', 10, 5) returning id into g;
  perform tt.t_raises('un segundo gratis no se puede',
    format($q$insert into benefits (business_id, name, type, cost_points, daily_quota) values (%L, 'Gratis 2', 'gratis', 10, 5)$q$, bid), 'un solo premio gratis');
  perform tt.t_raises('el mínimo de 3 cupones sigue',
    format($q$insert into benefits (business_id, name, type, cost_points, daily_quota, discount_detail) values (%L, 'Desc', 'descuento', 10, 1, '10 %%')$q$, bid), 'mínimo de 3 cupones');
  insert into benefits (business_id, name, type, cost_points, daily_quota, discount_detail) values (bid, 'Desc', 'descuento', 10, 5, '10 %') returning id into d;
  perform tt.t_true('con un gratis activo se puede un descuento', d is not null);
  perform tt.t_raises('un segundo descuento no se puede',
    format($q$insert into benefits (business_id, name, type, cost_points, daily_quota, discount_detail) values (%L, 'Desc 2', 'descuento', 10, 5, '10 %%')$q$, bid), 'un solo descuento');
end $$;

rollback;
