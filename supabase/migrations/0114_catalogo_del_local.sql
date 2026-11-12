-- Catálogo / menú del local: productos con foto y precio que se ven en la ficha del local en la app.
create table if not exists public.business_catalog_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  price_bs numeric(10,2) check (price_bs is null or (price_bs >= 0 and price_bs < 1000000)),
  image_url text,
  section text check (section is null or char_length(section) <= 40),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists business_catalog_items_business_idx on public.business_catalog_items (business_id, position);

alter table public.business_catalog_items enable row level security;

-- Cualquiera ve los productos activos de locales aprobados; el equipo del local ve y maneja todos los suyos.
drop policy if exists "catalog: public read" on public.business_catalog_items;
create policy "catalog: public read" on public.business_catalog_items for select
  using (
    (active and exists (select 1 from public.businesses b where b.id = business_id and b.approved))
    or is_business_member(business_id) or is_admin()
  );
drop policy if exists "catalog: members insert" on public.business_catalog_items;
create policy "catalog: members insert" on public.business_catalog_items for insert
  with check (is_business_member(business_id));
drop policy if exists "catalog: members update" on public.business_catalog_items;
create policy "catalog: members update" on public.business_catalog_items for update
  using (is_business_member(business_id)) with check (is_business_member(business_id));
drop policy if exists "catalog: members delete" on public.business_catalog_items;
create policy "catalog: members delete" on public.business_catalog_items for delete
  using (is_business_member(business_id));

-- Máximo 60 productos por local.
create or replace function public.limit_catalog_items() returns trigger as $$
begin
  if (select count(*) from public.business_catalog_items where business_id = new.business_id) >= 60 then
    raise exception 'Máximo 60 productos por local';
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists limit_catalog_items on public.business_catalog_items;
create trigger limit_catalog_items before insert on public.business_catalog_items
  for each row execute function public.limit_catalog_items();
