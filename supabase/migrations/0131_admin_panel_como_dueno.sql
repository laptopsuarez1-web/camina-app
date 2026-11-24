-- Admin puede entrar al panel de cualquier comercio y editarlo como su dueño: premios y catálogo (escribir)
-- y el resto de datos del panel (leer).
drop policy if exists "benefits: admin all" on public.benefits;
create policy "benefits: admin all" on public.benefits for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog: admin all" on public.business_catalog_items;
create policy "catalog: admin all" on public.business_catalog_items for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "business_local_codes: admin read" on public.business_local_codes;
create policy "business_local_codes: admin read" on public.business_local_codes for select using (public.is_admin());

drop policy if exists "business_staff: admin read" on public.business_staff;
create policy "business_staff: admin read" on public.business_staff for select using (public.is_admin());

drop policy if exists "business_level_points: admin read" on public.business_level_points;
create policy "business_level_points: admin read" on public.business_level_points for select using (public.is_admin());

drop policy if exists "business_route_codes: admin read" on public.business_route_codes;
create policy "business_route_codes: admin read" on public.business_route_codes for select using (public.is_admin());

drop policy if exists "business_notifications: admin read" on public.business_notifications;
create policy "business_notifications: admin read" on public.business_notifications for select using (public.is_admin());
