-- Eventos con más datos (como en Pasito): varias fotos, dónde queda y cómo conseguir entradas.
--   * photos: hasta 8 fotos extra (se ven al abrir el evento o desafío)
--   * place_name / place_address / place_url: dónde queda y link a Google Maps ("Cómo llegar")
--   * ticket_price: texto libre opcional ("Bs 30", "Entrada libre"); ticket_url: link de contacto o compra
--     (WhatsApp, Instagram, página web...) solo para eventos
-- request_promotion_v2 (0061) no cambia: la v3 la llama y después guarda estos datos.

alter table promotions add column if not exists photos text[] not null default '{}';
alter table promotions add column if not exists place_name text check (place_name is null or char_length(place_name) <= 80);
alter table promotions add column if not exists place_address text check (place_address is null or char_length(place_address) <= 160);
alter table promotions add column if not exists place_url text check (place_url is null or char_length(place_url) <= 300);
alter table promotions add column if not exists ticket_price text check (ticket_price is null or char_length(ticket_price) <= 40);
alter table promotions add column if not exists ticket_url text check (ticket_url is null or char_length(ticket_url) <= 300);
alter table promotions drop constraint if exists promotions_photos_chk;
alter table promotions add constraint promotions_photos_chk check (cardinality(photos) <= 8);

create or replace function request_promotion_v3(
  p_business_id uuid, p_kind text, p_title text, p_description text, p_prize text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_goal_mode text, p_goal_steps integer, p_goal_days integer, p_winners integer,
  p_bg_color text, p_bg_image_url text, p_cta_url text, p_bg_logo boolean,
  p_photos text[], p_place_name text, p_place_address text, p_place_url text,
  p_ticket_price text, p_ticket_url text
) returns promotions as $$
declare
  r promotions;
  v_photos text[] := coalesce(p_photos, '{}');
  v_place_url text := nullif(btrim(coalesce(p_place_url, '')), '');
  v_ticket_url text := nullif(btrim(coalesce(p_ticket_url, '')), '');
begin
  if p_kind = 'publicidad' and (cardinality(v_photos) > 0 or v_place_url is not null or nullif(btrim(coalesce(p_place_name, '')), '') is not null
                                or v_ticket_url is not null or nullif(btrim(coalesce(p_ticket_price, '')), '') is not null) then
    raise exception 'El banner solo lleva imagen y link.';
  end if;
  if cardinality(v_photos) > 8 then
    raise exception 'Hasta 8 fotos.';
  end if;
  if exists (select 1 from unnest(v_photos) u where u !~ '^https://' or char_length(u) > 500) then
    raise exception 'Alguna foto no es válida.';
  end if;
  if (v_place_url is not null and v_place_url !~ '^https://') or (v_ticket_url is not null and v_ticket_url !~ '^https://') then
    raise exception 'Los links tienen que empezar con https://';
  end if;
  if p_kind <> 'evento' and (v_ticket_url is not null or nullif(btrim(coalesce(p_ticket_price, '')), '') is not null) then
    raise exception 'Solo los eventos llevan entradas.';
  end if;
  r := request_promotion_v2(
    p_business_id, p_kind, p_title, p_description, p_prize, p_starts_at, p_ends_at,
    p_goal_mode, p_goal_steps, p_goal_days, p_winners, p_bg_color, p_bg_image_url, p_cta_url, p_bg_logo
  );
  update promotions set
    photos = v_photos,
    place_name = nullif(btrim(coalesce(p_place_name, '')), ''),
    place_address = nullif(btrim(coalesce(p_place_address, '')), ''),
    place_url = v_place_url,
    ticket_price = nullif(btrim(coalesce(p_ticket_price, '')), ''),
    ticket_url = v_ticket_url
  where id = r.id
  returning * into r;
  return r;
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function request_promotion_v3(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text, boolean, text[], text, text, text, text, text) from public, anon;
grant execute on function request_promotion_v3(uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer, text, text, text, boolean, text[], text, text, text, text, text) to authenticated;
