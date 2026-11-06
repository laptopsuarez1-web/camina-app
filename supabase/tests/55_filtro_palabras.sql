-- Filtro de malas palabras (0092).
begin;

do $$
declare u uuid; g uuid := gen_random_uuid();
begin
  perform tt.t_true('detecta una grosería', texto_ofensivo('qué mierda'));
  perform tt.t_true('con letras repetidas', texto_ofensivo('puuuuta'));
  perform tt.t_true('con números y símbolos', texto_ofensivo('p0t4') = false and texto_ofensivo('put@'));
  perform tt.t_true('con tildes y mayúsculas', texto_ofensivo('MARICÓN'));
  perform tt.t_true('separada con espacios', texto_ofensivo('h i j o d e p u t a'));
  perform tt.t_true('pegada a otra', texto_ofensivo('conchatumadre'));
  perform tt.t_true('no marca palabras normales: computadora', not texto_ofensivo('Mi computadora nueva'));
  perform tt.t_true('no marca palabras normales: disputa', not texto_ofensivo('La disputa del grupo'));
  perform tt.t_true('no marca palabras normales: Caminantes del centro', not texto_ofensivo('Caminantes del centro'));
  perform tt.t_true('no marca palabras normales: Concepción', not texto_ofensivo('Concepción y Cercado'));
  perform tt.t_true('no marca palabras normales: reputación', not texto_ofensivo('Tiene buena reputación'));
  perform tt.t_true('no marca palabras normales: perrito', not texto_ofensivo('Paseo con mi perrito'));
  perform tt.t_true('no marca nombres: Daniela Ríos', not texto_ofensivo('Daniela Ríos'));
  perform tt.t_true('texto vacío', not texto_ofensivo(null));

  u := tt.mk_user();
  perform tt.t_raises('no deja poner un nombre ofensivo', format('update profiles set full_name = %L where id = %L', 'El Pendejo', u), 'no se permiten');
  perform tt.t_raises('ni en la descripción', format('update profiles set bio = %L where id = %L', 'soy un cabrón', u), 'no se permiten');
  update profiles set bio = 'Camino todos los días' where id = u;
  perform tt.t_eq('una descripción normal pasa', (select bio from profiles where id = u), 'Camino todos los días');
  perform tt.t_raises('ni un grupo', format('insert into groups (id, name, created_by) values (%L, %L, %L)', g, 'Los Pelotudos', u), 'no se permiten');
  insert into groups (id, name, created_by) values (g, 'Caminantes', u);
  perform tt.t_raises('ni en el chat del grupo', format('insert into group_notes (group_id, user_id, text) values (%L, %L, %L)', g, u, 'callate imbécil'), 'no se permiten');
  insert into group_notes (group_id, user_id, text) values (g, u, '¡Vamos que hoy llegamos!');
  perform tt.t_eq('un mensaje normal pasa', (select count(*) from group_notes where group_id = g)::int, 1);
end $$;

rollback;
