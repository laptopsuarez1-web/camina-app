-- Preparación SOLO del modo PROPUESTAS=1 (se corre después de aplicar supabase/propuestas/*.sql).
--
-- tt.mk_benefit (01_helpers.sql) crea un comercio con plan 'paso_firme' como atajo de fixture. Muchas pruebas la llaman justo después de
-- tt.t_as(<persona>), que deja el claim de rol en 'authenticated' aunque la sesión de psql sea superusuario. Con la propuesta 0043
-- (SEC-04) un comercio creado "por una persona con sesión" ya no puede nacer con plan pago, y el fixture quedaría en 'primer_paso'
-- (un solo beneficio activo), lo que rompe pruebas que no tienen nada que ver. Acá el fixture crea el comercio como lo haría el SQL Editor
-- (sin rol de persona) y después restaura el claim. El resto del helper es idéntico.
create or replace function tt.mk_benefit(p_cost integer default 10, p_quota integer default 3) returns uuid language plpgsql as $$
declare
  b uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  v_role text := current_setting('request.jwt.claim.role', true);
begin
  perform set_config('request.jwt.claim.role', '', true);
  insert into businesses (id, name, category, plan, approved) values (b, 'Comercio ' || left(b::text, 4), 'Café', 'paso_firme', true);
  perform set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
  insert into benefits (id, business_id, name, type, cost_points, daily_quota) values (x, b, 'Café gratis', 'gratis', p_cost, p_quota);
  return x;
end $$;
