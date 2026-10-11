-- Prueba por propiedades del saldo FIFO: se compara user_points_balance (0033) con un "oráculo" que repite
-- el ledger en orden cronológico (cada gasto consume, entre los lotes que NO habían vencido ese día, los que
-- vencen antes; lo que sobra de un lote vencido se pierde). Es también la referencia para el arreglo propuesto.
begin;

create or replace function tt.oracle_balance(p_user uuid, p_at timestamptz default now()) returns integer
language plpgsql as $$
declare
  ev record; b record; need integer; take integer; res integer;
begin
  create temp table if not exists _ob (id bigserial primary key, amt integer, expires timestamptz, earned timestamptz) on commit drop;
  truncate _ob;
  for ev in select * from points_ledger where user_id = p_user and earned_at <= p_at order by earned_at, id loop
    if ev.amount > 0 then
      insert into _ob (amt, expires, earned) values (ev.amount, ev.expires_at, ev.earned_at);
    else
      need := -ev.amount;
      for b in select * from _ob where amt > 0 and (expires is null or expires > ev.earned_at)
               order by expires nulls last, earned, id loop
        take := least(b.amt, need);
        update _ob set amt = amt - take where id = b.id;
        need := need - take;
        exit when need = 0;
      end loop;
    end if;
  end loop;
  select coalesce(sum(amt), 0) into res from _ob where expires is null or expires > p_at;
  return res;
end $$;

do $$
declare
  scn integer; u uuid; nb integer; ns integer; i integer; t timestamptz; amt integer; earned timestamptz;
  total integer := 0; clean_total integer := 0; clean_bad integer := 0; any_bad integer := 0;
  first_expiry timestamptz; last_spend timestamptz; expected integer; actual integer; worst text := '';
begin
  perform setseed(0.2026);
  for scn in 1..300 loop
    u := tt.mk_user();
    nb := 1 + floor(random() * 5)::int;
    for i in 1..nb loop
      earned := now() - random() * interval '200 days';
      insert into points_ledger (user_id, amount, reason, earned_at, expires_at)
      values (u, 1 + floor(random() * 20)::int, 'steps', earned,
              earned + interval '90 days');   -- todos vencen a los 90 días: el orden de vencimiento coincide con el de ganancia
    end loop;
    ns := floor(random() * 4)::int;
    -- gastos en orden cronológico y solo si había saldo ese día (como exige redeem_benefit)
    for t in select now() - random() * interval '150 days' as ts from generate_series(1, ns) order by ts loop
      amt := 1 + floor(random() * 10)::int;
      if tt.oracle_balance(u, t) >= amt then
        insert into points_ledger (user_id, amount, reason, earned_at) values (u, -amt, 'redemption', t);
      end if;
    end loop;

    select min(expires_at) into first_expiry from points_ledger where user_id = u and amount > 0 and expires_at <= now();
    select max(earned_at) into last_spend from points_ledger where user_id = u and amount < 0;
    expected := tt.oracle_balance(u);
    actual := user_points_balance(u);
    total := total + 1;
    if actual is distinct from expected then any_bad := any_bad + 1; if worst = '' then worst := format('ejemplo: esperado=%s real=%s', expected, actual); end if; end if;
    -- "limpio": ningún lote venció antes del ÚLTIMO gasto (o no hay vencidos / gastos) => el cálculo debería coincidir
    if last_spend is null or first_expiry is null or last_spend < first_expiry then
      clean_total := clean_total + 1;
      if actual is distinct from expected then clean_bad := clean_bad + 1; end if;
    end if;
  end loop;

  perform tt.t_eq(format('escenarios sin gastos posteriores a un vencimiento (%s de %s): el saldo coincide con el oráculo', clean_total, total), clean_bad, 0);
  perform tt.t_xfail_true(format('todos los escenarios al azar coinciden con el oráculo (%s de %s difieren)', any_bad, total), any_bad = 0, worst);
end $$;

rollback;
