-- 0115: el aviso de los sábados para usar los Puntos (0112) pasa a tener su propio tipo, 'points_spend'.
-- Por qué: usaba el tipo 'nearby', el mismo de los avisos pagos de comercios cercanos (plan Paso Adelante).
-- approve_nearby_campaign no manda un aviso cercano a quien ya recibió uno de tipo 'nearby' en los últimos 7 días,
-- así que el aviso de Camina le habría quitado público a los comercios que pagan.
do $$
declare def text;
begin
  select pg_get_functiondef('public.queue_spend_nudge_notifications()'::regprocedure) into def;
  def := replace(def, 'jsonb_build_object(''type'', ''nearby'')', 'jsonb_build_object(''type'', ''points_spend'')');
  if position('points_spend' in def) = 0 then raise exception 'No se encontró el tipo del aviso'; end if;
  execute def;
end $$;
update notifications_outbox set data = jsonb_set(data, '{type}', '"points_spend"') where dedupe_key like 'spend_nudge:%' and data->>'type' = 'nearby';
