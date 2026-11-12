-- Premio solo para clientes nuevos: lo canjea únicamente quien nunca canjeó en ese local.
-- Se controla con un disparador en redemptions (cubre redeem_benefit y redeem_with_local_code sin tocarlas).
-- Las cuentas de prueba (qa_accounts) no tienen este límite, igual que con la espera entre canjes.
-- Cómo se revierte: drop trigger redemptions_new_customers_only on redemptions; drop function check_new_customers_only();
--   alter table benefits drop column new_customers_only;

alter table public.benefits add column if not exists new_customers_only boolean not null default false;

create or replace function public.check_new_customers_only() returns trigger as $$
begin
  if exists (select 1 from public.benefits b where b.id = new.benefit_id and b.new_customers_only)
     and not exists (select 1 from public.qa_accounts q where q.user_id = new.user_id)
     and exists (
       select 1 from public.redemptions r
       where r.user_id = new.user_id and r.business_id = new.business_id
         and r.status in ('pending', 'confirmed') and r.id is distinct from new.id
     ) then
    raise exception 'Este premio es solo para tu primera visita a este local';
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

revoke all on function public.check_new_customers_only() from public, anon, authenticated;

drop trigger if exists redemptions_new_customers_only on public.redemptions;
create trigger redemptions_new_customers_only before insert on public.redemptions
  for each row execute function public.check_new_customers_only();
