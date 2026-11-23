-- Cupos por semana y por mes (además del tope por día que ya existía).
-- Cómo se revierte: drop trigger redemptions_period_quota on redemptions; drop function check_period_quota();
--   drop function benefits_remaining_period(); alter table benefits drop column weekly_quota, drop column monthly_quota;
alter table public.benefits add column if not exists weekly_quota integer check (weekly_quota is null or weekly_quota > 0);
alter table public.benefits add column if not exists monthly_quota integer check (monthly_quota is null or monthly_quota > 0);

-- Semana = lunes a domingo y mes calendario, siempre en hora de Bolivia.
create or replace function public.check_period_quota() returns trigger as $$
declare
  v_week integer;
  v_month integer;
  v_used integer;
begin
  select weekly_quota, monthly_quota into v_week, v_month from benefits where id = new.benefit_id;
  if v_week is not null then
    select count(*) into v_used from redemptions
      where benefit_id = new.benefit_id and status in ('pending', 'confirmed')
        and date_trunc('week', created_at at time zone 'America/La_Paz') = date_trunc('week', now() at time zone 'America/La_Paz');
    if v_used >= v_week then
      raise exception 'Se agotaron los cupones de esta semana para este beneficio';
    end if;
  end if;
  if v_month is not null then
    select count(*) into v_used from redemptions
      where benefit_id = new.benefit_id and status in ('pending', 'confirmed')
        and date_trunc('month', created_at at time zone 'America/La_Paz') = date_trunc('month', now() at time zone 'America/La_Paz');
    if v_used >= v_month then
      raise exception 'Se agotaron los cupones de este mes para este beneficio';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists redemptions_period_quota on public.redemptions;
create trigger redemptions_period_quota before insert on public.redemptions
  for each row execute function public.check_period_quota();

-- Canjes de la semana y del mes por beneficio, para mostrar cuántos quedan sin exponer el historial ajeno.
create or replace function public.benefits_remaining_period()
returns table (benefit_id uuid, redeemed_week integer, redeemed_month integer) as $$
  select b.id,
         (select count(*)::int from redemptions r where r.benefit_id = b.id and r.status in ('pending', 'confirmed')
            and date_trunc('week', r.created_at at time zone 'America/La_Paz') = date_trunc('week', now() at time zone 'America/La_Paz')),
         (select count(*)::int from redemptions r where r.benefit_id = b.id and r.status in ('pending', 'confirmed')
            and date_trunc('month', r.created_at at time zone 'America/La_Paz') = date_trunc('month', now() at time zone 'America/La_Paz'))
  from benefits b
  where b.active and (b.weekly_quota is not null or b.monthly_quota is not null);
$$ language sql stable security definer set search_path = public;
grant execute on function public.benefits_remaining_period() to authenticated;
