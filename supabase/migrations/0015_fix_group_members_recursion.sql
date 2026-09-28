-- Bug real, no de esta sesión: la policy de "group_members: members read"
-- consultaba group_members para decidir si se puede leer group_members —
-- Postgres lo detecta como recursión infinita (42P17) y cualquier select a
-- groups/group_members con el embed de PostgREST (select=*,group_members(...))
-- rompía con 500. Esto tiraba abajo "Tus grupos" en Inicio y toda la pantalla
-- de Grupos. Se arregla con una función security definer: al no evaluarse
-- bajo la RLS de la tabla que está siendo consultada, no hay recursión.
create or replace function is_group_member(p_group_id uuid) returns boolean as $$
  select exists (
    select 1 from group_members where group_id = p_group_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "group_members: members read" on group_members;
create policy "group_members: members read" on group_members for select
  using (is_group_member(group_id));

drop policy if exists "group_notes: members read" on group_notes;
create policy "group_notes: members read" on group_notes for select
  using (is_group_member(group_id));

drop policy if exists "group_notes: members write" on group_notes;
create policy "group_notes: members write" on group_notes for insert
  with check (auth.uid() = user_id and is_group_member(group_id));
