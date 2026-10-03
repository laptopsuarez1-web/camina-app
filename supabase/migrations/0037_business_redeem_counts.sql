-- Cuántos canjes confirmados tiene cada comercio, para mostrarlo en su ficha.
-- Solo devuelve los que llegan a 100: con pocos canjes el número no dice nada y no se muestra.
-- security definer porque cada persona solo puede ver sus propios canjes (RLS de redemptions).
create or replace function business_redeem_counts()
returns table (business_id uuid, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.business_id, count(*) as total
  from redemptions r
  where r.status = 'confirmed'
  group by r.business_id
  having count(*) >= 100;
$$;

revoke execute on function business_redeem_counts() from public, anon;
grant execute on function business_redeem_counts() to authenticated;
