-- PROPUESTA 0041 — Los pasos solo se escriben por earn_points_from_steps (se cierra la escritura directa a steps_daily)
--
-- Hallazgos: SEC-02 (alto), CR-03 (alto) y la parte A de SEC-03.
-- Qué arregla: las políticas "steps: upsert own" (INSERT) y "steps: update own" (UPDATE) de la 0001, más los permisos
--   INSERT/UPDATE/DELETE de authenticated, dejan que cualquier persona con sesión escriba pasos de cualquier día y de cualquier
--   cantidad (solo hay un recorte a 60.000 por trigger) saltándose earn_points_from_steps: la ventana hoy/ayer, la
--   plausibilidad de la 0038 y el tope. Esos pasos alimentan el ranking global, los retos que pagan Puntos (rachas, metas
--   semanales), el pozo de los desafíos de grupo y los sorteos con premios reales. También se puede fijar a mano la meta del
--   día (columna goal) y "cumplir" días pasados.
-- Qué hace: borra las dos políticas y revoca INSERT/UPDATE/DELETE/TRUNCATE a anon y authenticated. Deja la política
--   "steps: select own" y el permiso de SELECT (la app lee la tabla). earn_points_from_steps es security definer
--   (corre como postgres) y sigue escribiendo; el trigger de recorte (clamp_daily_steps) queda como defensa en profundidad.
-- Impacto en el cliente: ninguno. grep en apps/mobile/src, apps/partner y supabase/functions: steps_daily solo se LEE
--   (useStreak, useGroupRanking, useGroupDetail, useMyGroupsWeek, puntos.tsx, actividad.tsx); no hay insert/update/upsert/delete.
--   delete-account y la cascada de borrado de perfil no se afectan (corren como service_role/postgres).
-- NO borra ni toca filas: las 34 filas de steps_daily sin crédito en points_ledger (30 de la cuenta QA/admin, 4 del usuario 5a15974b)
--   siguen contando para rankings y retos hasta que el dueño decida (ver README, "Limpieza de datos").
-- Idempotente: sí.
-- Cómo se revierte (reabre el agujero, no recomendado):
--   create policy "steps: upsert own" on public.steps_daily for insert with check (auth.uid() = user_id);
--   create policy "steps: update own" on public.steps_daily for update using (auth.uid() = user_id);
--   grant insert, update, delete on public.steps_daily to authenticated;

drop policy if exists "steps: upsert own" on public.steps_daily;
drop policy if exists "steps: update own" on public.steps_daily;

revoke insert, update, delete, truncate on public.steps_daily from anon, authenticated;
