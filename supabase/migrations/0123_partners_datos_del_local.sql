-- 0123: Partners cargan los datos del local (descripción, horario, ubicación, fotos y premio) y ven cómo queda.
-- Camina los revisa y publica. Las fotos van a una carpeta propia: partner-leads/<user_id>/<lead_id>/...

alter table public.partner_leads
  add column if not exists category text,
  add column if not exists address text,
  add column if not exists description text,
  add column if not exists hours_text text,
  add column if not exists instagram text,
  add column if not exists maps_url text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists benefit_kind text check (benefit_kind in ('gratis', 'descuento')),
  add column if not exists benefit_name text,
  add column if not exists benefit_description text,
  add column if not exists benefit_image_url text,
  add column if not exists benefit_cost integer check (benefit_cost is null or benefit_cost between 1 and 1000),
  add column if not exists benefit_quota integer check (benefit_quota is null or benefit_quota between 1 and 1000);

-- El partner guarda los datos de un local que reportó (mientras siga "En revisión").
create or replace function public.partner_save_lead_details(p_lead uuid, p_data jsonb)
returns public.partner_leads
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_leads;
  v_kind text;
begin
  select l.* into v_row from public.partner_leads l
    join public.partners p on p.id = l.partner_id
    where l.id = p_lead and p.user_id = auth.uid();
  if not found then raise exception 'No encontramos ese local.'; end if;
  if v_row.status not in ('reportado') then raise exception 'Este local ya está en proceso. Escríbenos por WhatsApp si hay que cambiar algo.'; end if;
  v_kind := case when p_data ? 'benefit_kind' then nullif(p_data->>'benefit_kind', '') else v_row.benefit_kind end;
  if v_kind is not null and v_kind not in ('gratis', 'descuento') then raise exception 'Elige si el premio es gratis o con descuento.'; end if;

  update public.partner_leads set
    category = case when p_data ? 'category' then left(nullif(trim(p_data->>'category'), ''), 80) else category end,
    address = case when p_data ? 'address' then left(nullif(trim(p_data->>'address'), ''), 200) else address end,
    description = case when p_data ? 'description' then left(nullif(trim(p_data->>'description'), ''), 500) else description end,
    hours_text = case when p_data ? 'hours_text' then left(nullif(trim(p_data->>'hours_text'), ''), 200) else hours_text end,
    instagram = case when p_data ? 'instagram' then left(nullif(trim(p_data->>'instagram'), ''), 100) else instagram end,
    maps_url = case when p_data ? 'maps_url' then left(nullif(trim(p_data->>'maps_url'), ''), 500) else maps_url end,
    lat = case when p_data ? 'lat' then (p_data->>'lat')::double precision else lat end,
    lng = case when p_data ? 'lng' then (p_data->>'lng')::double precision else lng end,
    logo_url = case when p_data ? 'logo_url' then left(nullif(p_data->>'logo_url', ''), 500) else logo_url end,
    cover_url = case when p_data ? 'cover_url' then left(nullif(p_data->>'cover_url', ''), 500) else cover_url end,
    benefit_kind = v_kind,
    benefit_name = case when p_data ? 'benefit_name' then left(nullif(trim(p_data->>'benefit_name'), ''), 80) else benefit_name end,
    benefit_description = case when p_data ? 'benefit_description' then left(nullif(trim(p_data->>'benefit_description'), ''), 300) else benefit_description end,
    benefit_image_url = case when p_data ? 'benefit_image_url' then left(nullif(p_data->>'benefit_image_url', ''), 500) else benefit_image_url end,
    benefit_cost = case when p_data ? 'benefit_cost' then (p_data->>'benefit_cost')::integer else benefit_cost end,
    benefit_quota = case when p_data ? 'benefit_quota' then (p_data->>'benefit_quota')::integer else benefit_quota end
  where id = p_lead
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.partner_save_lead_details(uuid, jsonb) from public, anon;
grant execute on function public.partner_save_lead_details(uuid, jsonb) to authenticated;

-- Fotos de los locales que cargan los partners.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-leads', 'partner-leads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "partner-leads: partner write" on storage.objects for insert
  with check (bucket_id = 'partner-leads' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.partners p where p.user_id = auth.uid()));
create policy "partner-leads: partner update" on storage.objects for update
  using (bucket_id = 'partner-leads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "partner-leads: partner delete" on storage.objects for delete
  using (bucket_id = 'partner-leads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "partner-leads: owner or admin read" on storage.objects for select
  using (bucket_id = 'partner-leads' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
