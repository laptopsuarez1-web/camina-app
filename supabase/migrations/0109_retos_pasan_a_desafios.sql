-- 0109: "Retos" pasa a llamarse "Desafíos" en los mensajes que ve la persona.
-- Qué cambia: solo los textos de claim_reto (errores y el aviso de "completado"). La lógica no se toca.
-- Qué NO cambia: los nombres internos (tabla retos, función claim_reto, tipo de aviso 'reto') ni el prefijo 'Reto: '
-- de la nota del movimiento de Puntos, que la app usa para reconocer el movimiento.
-- Cómo se revierte: volver a correr las mismas sustituciones al revés.
do $$
declare
  def text;
  pairs text[][] := array[
    ['Todavía no completaste este reto.', 'Todavía no completaste este desafío.'],
    ['Todavía te faltan amigos para este reto.', 'Todavía te faltan amigos para este desafío.'],
    ['Ya completaste este reto.', 'Ya completaste este desafío.'],
    ['Ya cobraste este reto.', 'Ya cobraste este desafío.'],
    ['Ese reto no está disponible.', 'Ese desafío no está disponible.'],
    ['¡Reto completado! 🎉', '¡Desafío completado! 🎉']
  ];
  i int;
begin
  select pg_get_functiondef('public.claim_reto(uuid)'::regprocedure) into def;
  for i in 1 .. array_length(pairs, 1) loop
    def := replace(def, pairs[i][1], pairs[i][2]);
  end loop;
  execute def;
end $$;
