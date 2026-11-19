-- Lista "Avísame" en el panel de administrador: los admins la ven, marcan a quién ya le avisaron y pueden borrar.
-- El público sigue pudiendo solo anotarse (0127). Nadie más puede leerla.
alter table avisame add column if not exists avisado_at timestamptz;

drop policy if exists "avisame: admin lee" on avisame;
create policy "avisame: admin lee" on avisame for select to authenticated using (is_admin());

drop policy if exists "avisame: admin marca avisado" on avisame;
create policy "avisame: admin marca avisado" on avisame for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "avisame: admin borra" on avisame;
create policy "avisame: admin borra" on avisame for delete to authenticated using (is_admin());
