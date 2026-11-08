-- 0100: palabras de "lo que ofrece" el local.
begin;

do $$
declare
  owner uuid; b uuid := gen_random_uuid();
begin
  owner := tt.mk_user();
  insert into businesses (id, name, category, plan, approved, owner_user_id) values (b, 'Jugos Tarija', 'Batidos & Jugos', 'paso_firme', true, owner);
  perform tt.t_eq('arranca sin palabras', (select cardinality(keywords) from businesses where id = b), 0);
  update businesses set keywords = array['batidos', 'jugos naturales', 'nutricionista'] where id = b;
  perform tt.t_eq('guarda las palabras', (select keywords from businesses where id = b), array['batidos', 'jugos naturales', 'nutricionista']);
  perform tt.t_raises('hasta 12 palabras',
    format('update businesses set keywords = %L where id = %L', array['a','b','c','d','e','f','g','h','i','j','k','l','m'], b), 'businesses_keywords_check');
  perform tt.t_raises('no deja malas palabras en lo que escribe',
    format('update businesses set keywords = %L where id = %L', array['jugos', 'mierda'], b), 'no se permiten');
  perform tt.t_raises('ni en una categoría escrita a mano',
    format('update businesses set category = %L where id = %L', 'puta', b), 'no se permiten');
end $$;

rollback;
