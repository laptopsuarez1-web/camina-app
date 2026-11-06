-- Filtro de malas palabras: nombres, descripciones, nombres de grupos y desafíos, y el chat del grupo.
-- Se revisa en el servidor (no se puede saltear desde la app). Normaliza el texto antes de buscar: minúsculas, sin
-- tildes, números y símbolos que imitan letras (p0t4, put@), letras repetidas (puuuta) y espacios entre letras.
-- La lista es corta y a propósito: insultos y groserías fuertes, sin palabras comunes que den falsos positivos.

create or replace function _texto_normalizado(p text) returns text as $f$
  select regexp_replace(
           regexp_replace(
             translate(lower(coalesce(p, '')), 'áàäâéèëêíìïîóòöôúùüûñ01345@$7', 'aaaaeeeeiiiioooouuuunoieasast'),
             '[^a-z]+', ' ', 'g'),
           '([a-z])\1+', '\1', 'g');
$f$ language sql immutable;

create or replace function texto_ofensivo(p text) returns boolean as $f$
declare
  t text := _texto_normalizado(p);
  junto text := replace(_texto_normalizado(p), ' ', '');
  w text;
begin
  if t = '' then return false; end if;
  -- Frases o palabras que se escriben juntas o separadas con espacios/puntos ("h i j o d e p u t a").
  if junto ~ '(hijodeputa|hijueputa|hijaeputa|putamadre|conchatumadre|conchetumadre|malparid|chupamela|chupapija|mamaguev|comemierd|carechimba)' then
    return true;
  end if;
  foreach w in array regexp_split_to_array(trim(t), ' ') loop
    -- Palabras exactas (ya normalizadas: sin tildes y sin letras repetidas).
    if w = any (array['puta','putas','puto','putos','putita','putito','hdp','mierda','mierdas','verga','vergas','pinga','pija','pijas',
                      'chucha','cojudo','cojuda','cojudos','maricon','maricones','marica','maricas','joto','jotos','culero','culera',
                      'pendejo','pendeja','pendejos','pelotudo','pelotuda','cabron','cabrona','cabrones','chingada','chingar','chingas',
                      'follar','porno','xxx','imbecil','imbeciles',
                      'mrd','ctm','ptm','hijueputa','gilipollas','conchudo','conchuda','huevon','weon','webon','careverga',
                      'puton','putona']) then
      return true;
    end if;
    -- Raíces que no aparecen dentro de palabras normales.
    if w ~ '^(put[aoi]s?$|puteri|putead|hijueput|vergaz|vergud|cojud|mariconz|pendejad|pelotud|culer[oa]|mierdos|cabronaz|chingad|chingon|follad|pornogr)' then
      return true;
    end if;
  end loop;
  return false;
end;
$f$ language plpgsql immutable;

create or replace function _sin_malas_palabras() returns trigger as $f$
declare
  col text;
  nuevo text;
  viejo text;
begin
  foreach col in array tg_argv loop
    nuevo := to_jsonb(new) ->> col;
    viejo := case when tg_op = 'UPDATE' then to_jsonb(old) ->> col end;
    -- Solo se revisa lo que cambia (no bloquea perfiles viejos que se editan en otra cosa).
    if nuevo is distinct from viejo and texto_ofensivo(nuevo) then
      raise exception 'Ese texto tiene palabras que no se permiten en Camina. Cámbialo, por favor.';
    end if;
  end loop;
  return new;
end;
$f$ language plpgsql set search_path = public;

drop trigger if exists filtro_perfil on profiles;
create trigger filtro_perfil before insert or update of full_name, bio on profiles
  for each row execute function _sin_malas_palabras('full_name', 'bio');

drop trigger if exists filtro_grupo on groups;
create trigger filtro_grupo before insert or update of name on groups
  for each row execute function _sin_malas_palabras('name');

drop trigger if exists filtro_chat_grupo on group_notes;
create trigger filtro_chat_grupo before insert or update of text on group_notes
  for each row execute function _sin_malas_palabras('text');

drop trigger if exists filtro_desafio on group_challenges;
create trigger filtro_desafio before insert or update of name on group_challenges
  for each row execute function _sin_malas_palabras('name');

revoke execute on function texto_ofensivo(text) from public, anon;
grant execute on function texto_ofensivo(text) to authenticated;
revoke execute on function _texto_normalizado(text), _sin_malas_palabras() from public, anon, authenticated;
