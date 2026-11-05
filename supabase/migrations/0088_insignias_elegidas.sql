-- Insignias del perfil: cada persona elige hasta 5 para mostrar (antes era 1 sola "destacada").
-- Se guardan en la misma columna profiles.featured_badge, separadas por coma y en el orden elegido.
-- Una sola insignia sigue siendo válida, así que las versiones anteriores de la app no se rompen.
create or replace function set_featured_badge(p_badge text) returns void as $f$
declare
  v_keys text[];
  k text;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_badge is not null and p_badge <> '' then
    v_keys := string_to_array(p_badge, ',');
    if cardinality(v_keys) > 5 then raise exception 'Máximo 5 insignias'; end if;
    if cardinality(v_keys) <> (select count(distinct x) from unnest(v_keys) x) then raise exception 'Insignia inválida'; end if;
    foreach k in array v_keys loop
      if k !~ '^(ruta:[0-9]{4}-[0-9]{2}-01|local:[0-9a-f-]{36})$' then raise exception 'Insignia inválida'; end if;
    end loop;
  end if;
  update profiles set featured_badge = nullif(p_badge, '') where id = auth.uid();
end;
$f$ language plpgsql security definer set search_path = public;

revoke execute on function set_featured_badge(text) from public, anon;
grant execute on function set_featured_badge(text) to authenticated;
