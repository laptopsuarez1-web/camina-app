-- 0102: el comercio guarda qué plan pidió al registrarse; solo valores conocidos.
begin;
do $$
declare u uuid; b uuid;
begin
  u := tt.mk_user(); perform tt.t_as(u);
  insert into businesses (owner_user_id, name, category, plan, requested_plan) values (u, 'Local plan', 'Café', 'primer_paso', 'paso_firme') returning id into b;
  perform tt.t_eq('el comercio guarda el plan que pidió', (select requested_plan from businesses where id = b), 'paso_firme');
  perform tt.t_eq('el plan real sigue siendo el gratis hasta que lo activemos', (select plan::text from businesses where id = b), 'primer_paso');
  update businesses set requested_plan = 'fundador' where id = b;
  perform tt.t_eq('lo puede cambiar el dueño', (select requested_plan from businesses where id = b), 'fundador');
  perform tt.t_raises('no acepta valores raros', format('update businesses set requested_plan = %L where id = %L', 'vip', b), 'requested_plan');
end $$;
rollback;
