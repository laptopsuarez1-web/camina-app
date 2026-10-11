-- PROPUESTA 0046 — La lista de grupos solo se lee con sesión (antes la podía leer cualquiera con la clave pública)
--
-- Hallazgo: SEC-08 (medio en la auditoría, bajo según el verificador).
-- Qué arregla: la política "groups: members read" (0001) está escrita "(es miembro) OR true" y aplica al rol public, que incluye a
--   anon: con solo la clave anon de la app (pública, va dentro del binario) se listan todos los grupos (id, nombre, quién lo creó,
--   meta). No se ven chat ni miembros (esos siguen cerrados), pero los ids sirven para unirse (ver SEC-09, decisión aparte).
-- Qué hace: borra esa política y crea "groups: authenticated read" solo para authenticated (using true: la lista de "grupos para
--   unirte" sigue viendo todos), y le revoca SELECT a anon como cinturón y tirantes. Las políticas de insert y update de groups
--   no cambian.
-- Impacto en el cliente: ninguno. Todas las lecturas de groups de la app son de personas con sesión (useGroups, useGroupDetail,
--   join-group/[groupId].tsx —que exige sesión—, grupos/index.tsx). Los RPC security definer no pasan por RLS.
-- Idempotente: sí.
-- Cómo se revierte:
--   drop policy if exists "groups: authenticated read" on public.groups;
--   create policy "groups: members read" on public.groups for select using (true);
--   grant select on public.groups to anon;

drop policy if exists "groups: members read" on groups;
drop policy if exists "groups: authenticated read" on groups;
create policy "groups: authenticated read" on groups for select to authenticated using (true);

revoke select on public.groups from anon;
